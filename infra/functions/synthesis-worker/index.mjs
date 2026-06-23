/**
 * Synthesis Worker Lambda — SQS consumer.
 *
 * Processes async synthesis jobs queued by the router.
 * Same provider adapters, but runs with a 5-minute timeout.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { estimateAudioDurationMs } from './audio-duration.mjs';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const BUCKET = process.env.S3_BUCKET || '';
const JOB_TABLE = process.env.SYNTHESIS_JOB_TABLE || '';
const CREDENTIAL_TABLE = process.env.USER_CREDENTIAL_TABLE || '';
const USAGE_TABLE = process.env.USER_MEDIA_USAGE_TABLE || '';

// ─── Adapters (inline imports to avoid layer/symlink complexity for now) ───

const adapters = {};

async function loadAdapters() {
  // Dynamic imports; these adapter files don't exist in this function's CodeUri,
  // so for P1 we inline the 3 adapters. In P2 we'll use a Lambda Layer.
  adapters.openai = {
    async synthesize(cred, params) {
      const resp = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cred.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: params.options?.model || 'tts-1',
          voice: params.providerVoiceId || 'alloy',
          input: params.text,
          response_format: params.format || 'mp3',
        }),
      });
      if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
      return { audio: Buffer.from(await resp.arrayBuffer()), contentType: 'audio/mpeg' };
    }
  };

  adapters.elevenlabs = {
    async synthesize(cred, params) {
      const voiceId = params.providerVoiceId || '';
      const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': cred.apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body: JSON.stringify({ text: params.text, model_id: 'eleven_multilingual_v2' }),
      });
      if (!resp.ok) throw new Error(`ElevenLabs ${resp.status}: ${await resp.text()}`);
      return { audio: Buffer.from(await resp.arrayBuffer()), contentType: 'audio/mpeg' };
    }
  };

  adapters.deepgram = {
    async synthesize(cred, params) {
      const model = params.providerVoiceId || 'aura-2-thalia-en';
      const resp = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${cred.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: params.text }),
      });
      if (!resp.ok) throw new Error(`Deepgram ${resp.status}: ${await resp.text()}`);
      return { audio: Buffer.from(await resp.arrayBuffer()), contentType: 'audio/mpeg' };
    }
  };
}

// ─── Credential loader ───

async function loadCredential(userId, providerId) {
  const result = await ddb.send(new ScanCommand({
    TableName: CREDENTIAL_TABLE,
    FilterExpression: 'begins_with(#owner, :ownerPrefix) AND providerId = :pid AND #status = :active',
    ExpressionAttributeNames: { '#owner': 'owner', '#status': 'status' },
    ExpressionAttributeValues: { ':ownerPrefix': `${userId}::`, ':pid': providerId, ':active': 'active' },
    Limit: 1,
  }));
  if (!result.Items?.length) return null;
  try { return JSON.parse(result.Items[0].credentialData); } catch { return null; }
}

// ─── Usage increment ───

async function incrementUsage(userId, sizeBytes) {
  await ddb.send(new UpdateCommand({
    TableName: USAGE_TABLE,
    Key: { userId },
    UpdateExpression: 'ADD totalBytes :size, fileCount :one SET lastUpdatedAt = :now',
    ExpressionAttributeValues: { ':size': sizeBytes, ':one': 1, ':now': new Date().toISOString() },
  }));
}

// ─── Job update ───

async function updateJob(jobId, updates) {
  const exprs = [];
  const names = {};
  const values = {};
  for (const [k, v] of Object.entries(updates)) {
    exprs.push(`#${k} = :${k}`);
    names[`#${k}`] = k;
    values[`:${k}`] = v;
  }
  exprs.push('#updatedAt = :updatedAt');
  names['#updatedAt'] = 'updatedAt';
  values[':updatedAt'] = new Date().toISOString();

  await ddb.send(new UpdateCommand({
    TableName: JOB_TABLE,
    Key: { id: jobId },
    UpdateExpression: `SET ${exprs.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

// ─── Handler ───

export async function handler(event) {
  await loadAdapters();

  for (const record of event.Records) {
    const message = JSON.parse(record.body);
    const { jobId, userId, provider, voiceId, providerVoiceId, text, mode, options } = message;

    console.log(`Processing job ${jobId} for user ${userId} via ${provider}`);

    try {
      const adapter = adapters[provider];
      if (!adapter) throw new Error(`Unsupported provider: ${provider}`);

      const credential = await loadCredential(userId, provider);
      if (!credential) throw new Error(`No credential for ${provider}`);

      const start = Date.now();

      const result = await adapter.synthesize(credential, {
        voiceId: voiceId || '',
        providerVoiceId: providerVoiceId || '',
        text,
        mode: mode || 'text',
        format: options?.format || 'mp3',
        options: options || {},
      });

      const latencyMs = Date.now() - start;
      const audioPath = `users/${userId}/synth/${jobId}.mp3`;

      // Upload to S3
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: audioPath,
        Body: result.audio,
        ContentType: result.contentType || 'audio/mpeg',
      }));

      // Generate presigned URL
      const audioUrl = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: BUCKET,
        Key: audioPath,
      }), { expiresIn: 604800 });

      // Update job
      await updateJob(jobId, {
        status: 'completed',
        audioPath,
        audioUrl,
        fileSizeBytes: result.audio.length,
        latencyMs,
        durationMs: result.durationMs ?? estimateAudioDurationMs(result.audio, result.contentType),
      });

      // Increment usage
      await incrementUsage(userId, result.audio.length);

      console.log(`Job ${jobId} completed: ${result.audio.length} bytes, ${latencyMs}ms`);
    } catch (err) {
      console.error(`Job ${jobId} failed:`, err);
      await updateJob(jobId, {
        status: 'failed',
        errorMessage: err.message,
      }).catch(e => console.error('Failed to update job status:', e));
    }
  }
}
