/**
 * Synthesis Router Lambda
 *
 * Handles all /v1/* routes. Authenticates via the auth function inline
 * (since HTTP API doesn't have native Lambda authorizer for all routes in SAM simple mode).
 *
 * Routes:
 *   POST   /v1/synthesize    — Create synthesis job (sync or async)
 *   GET    /v1/jobs           — List user's jobs
 *   GET    /v1/jobs/{id}      — Get job details
 *   PATCH  /v1/jobs/{id}      — Update clip metadata
 *   DELETE /v1/jobs/{id}      — Delete job + audio
 *   GET    /v1/media/usage    — Get storage usage
 *   GET    /v1/providers      — List providers (account-enabled only; ?all=true for full catalog)
 *   GET    /v1/voices         — List voices for enabled providers (filterable)
 *   GET    /v1/voices/{id}    — Get voice detail
 *   POST   /v1/keys           — Create API key
 *   GET    /v1/keys           — List API keys
 *   DELETE /v1/keys/{id}      — Revoke API key
 *   POST   /v1/credentials         — Store provider credential (BYOK)
 *   GET    /v1/credentials         — List credentials (masked)
 *   DELETE /v1/credentials/{prov}  — Remove credential
 *   POST   /v1/credentials/test    — Test credential (dry-run)
 */

import { createHash, randomBytes } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import { createJob, getJob, listJobs, deleteJob, updateJob } from './lib/jobs.mjs';
import { checkQuota, getUsage, incrementUsage, decrementUsage } from './lib/quota.mjs';
import { createApiKey, listApiKeys, revokeApiKey } from './lib/keys.mjs';
import { saveCredential, listCredentials, deleteCredential, testCredential } from './lib/credentials.mjs';
import { getAllProviders, getEnabledProviders, getProvider } from './lib/providers.mjs';
import { queryVoices, getVoiceById } from './lib/voices.mjs';

// Adapters
import * as openaiAdapter from './lib/adapters/openai.mjs';
import * as elevenlabsAdapter from './lib/adapters/elevenlabs.mjs';
import * as deepgramAdapter from './lib/adapters/deepgram.mjs';
import * as geminiTtsAdapter from './lib/adapters/gemini-tts.mjs';
import * as cartesiaAdapter from './lib/adapters/cartesia.mjs';
import * as lmntAdapter from './lib/adapters/lmnt.mjs';
import * as gcpTtsAdapter from './lib/adapters/gcp-tts.mjs';
import * as azureSpeechAdapter from './lib/adapters/azure-speech.mjs';
import * as awsPollyAdapter from './lib/adapters/aws-polly.mjs';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const sqs = new SQSClient({});

const BUCKET = process.env.S3_BUCKET || '';
const QUEUE_URL = process.env.SYNTHESIS_QUEUE_URL || '';
const API_KEY_TABLE = process.env.API_KEY_TABLE || '';
const CREDENTIAL_TABLE = process.env.USER_CREDENTIAL_TABLE || '';

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || '';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const adapters = {
  openai: openaiAdapter,
  elevenlabs: elevenlabsAdapter,
  deepgram: deepgramAdapter,
  'gemini-tts': geminiTtsAdapter,
  cartesia: cartesiaAdapter,
  lmnt: lmntAdapter,
  'gcp-tts': gcpTtsAdapter,
  'azure-speech': azureSpeechAdapter,
  'aws-polly': awsPollyAdapter,
};

// ─── Auth (inline — validates API key or Cognito JWT) ───

function hashApiKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

function base64UrlDecode(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

async function authenticate(event) {
  // HTTP API v2 lowercases all headers
  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    // Log available headers for debugging
    console.log('Available headers:', Object.keys(headers).join(', '));
    throw new Error('Missing Authorization header');
  }

  const token = authHeader.slice(7);

  if (token.startsWith('vk_live_')) {
    // API key
    const keyHash = hashApiKey(token);
    const result = await ddb.send(new GetCommand({
      TableName: API_KEY_TABLE,
      Key: { keyHash },
    }));
    if (!result.Item || result.Item.status !== 'active') {
      throw new Error('Invalid or revoked API key');
    }
    return result.Item.userId;
  }

  if (token.startsWith('eyJ')) {
    // Cognito JWT — decode payload to get sub
    const parts = token.split('.');
    if (parts.length < 2) throw new Error('Invalid JWT');
    const payload = JSON.parse(base64UrlDecode(parts[1]).toString());

    // Basic validation
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) throw new Error('Token expired');
    if (payload.iss !== `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`) {
      throw new Error('Invalid token issuer');
    }
    const clientId = payload.aud || payload.client_id;
    if (clientId !== COGNITO_CLIENT_ID) throw new Error('Invalid token audience');

    return payload.sub;
  }

  throw new Error('Unrecognized authorization token');
}

// ─── Route handler ───

export async function handler(event) {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.rawPath || event.path || '';

  // CORS preflight
  if (method === 'OPTIONS') return respond(200, {});

  // Authenticate
  let userId;
  try {
    userId = await authenticate(event);
  } catch (err) {
    return respond(401, { error: 'Unauthorized', message: err.message });
  }

  try {
    // Route matching
    if (method === 'POST' && path === '/v1/synthesize') {
      return await handleSynthesize(userId, event);
    }
    if (method === 'GET' && path === '/v1/jobs') {
      return await handleListJobs(userId, event);
    }
    if (method === 'GET' && path.startsWith('/v1/jobs/')) {
      const jobId = path.split('/v1/jobs/')[1];
      return await handleGetJob(userId, jobId);
    }
    if (method === 'PATCH' && path.startsWith('/v1/jobs/')) {
      const jobId = path.split('/v1/jobs/')[1];
      return await handleUpdateJob(userId, jobId, event);
    }
    if (method === 'DELETE' && path.startsWith('/v1/jobs/')) {
      const jobId = path.split('/v1/jobs/')[1];
      return await handleDeleteJob(userId, jobId);
    }
    if (method === 'GET' && path === '/v1/media/usage') {
      return await handleGetUsage(userId);
    }
    if (method === 'POST' && path === '/v1/keys') {
      return await handleCreateKey(userId, event);
    }
    if (method === 'GET' && path === '/v1/keys') {
      return await handleListKeys(userId);
    }
    if (method === 'DELETE' && path.startsWith('/v1/keys/')) {
      const keyId = path.split('/v1/keys/')[1];
      return await handleDeleteKey(userId, keyId);
    }

    // Discovery endpoints
    if (method === 'GET' && path === '/v1/providers') {
      return await handleListProviders(userId, event);
    }
    if (method === 'GET' && path === '/v1/voices') {
      return await handleListVoices(userId, event);
    }
    if (method === 'GET' && path.startsWith('/v1/voices/')) {
      const voiceId = path.split('/v1/voices/')[1];
      return await handleGetVoice(userId, voiceId);
    }

    // Credential management
    if (method === 'POST' && path === '/v1/credentials') {
      return await handleSaveCredential(userId, event);
    }
    if (method === 'GET' && path === '/v1/credentials') {
      return await handleListCredentials(userId);
    }
    if (method === 'POST' && path === '/v1/credentials/test') {
      return await handleTestCredential(userId, event);
    }
    if (method === 'DELETE' && path.startsWith('/v1/credentials/')) {
      const providerId = decodeURIComponent(path.split('/v1/credentials/')[1]);
      return await handleDeleteCredential(userId, providerId);
    }

    // Also handle stage-prefixed paths: /dev/v1/...
    const stagePrefix = `/${process.env.STAGE || 'dev'}`;
    if (path.startsWith(stagePrefix)) {
      const stripped = path.slice(stagePrefix.length);
      return await handler({ ...event, rawPath: stripped, path: stripped });
    }

    return respond(404, { error: 'Not found' });
  } catch (err) {
    console.error('Handler error:', err);
    return respond(500, { error: 'Internal error', message: err.message });
  }
}

// ─── POST /v1/synthesize ───

async function handleSynthesize(userId, event) {
  const body = JSON.parse(event.body || '{}');
  const { voiceId, text, provider, mode = 'text', options = {} } = body;
  const isAsync = body.async === true;

  if (!text?.trim()) return respond(400, { error: 'text is required' });
  if (!provider) return respond(400, { error: 'provider is required' });
  if (text.length > 5000) return respond(400, { error: 'text exceeds 5000 character limit' });

  // Check adapter exists
  const adapter = adapters[provider];
  if (!adapter) {
    return respond(400, {
      error: `Unsupported provider: ${provider}`,
      supported: Object.keys(adapters),
    });
  }

  // Check quota
  const estimatedBytes = text.length * 20; // conservative MP3 estimate
  const quota = await checkQuota(userId, estimatedBytes);
  if (!quota.allowed) {
    return respond(400, {
      error: 'quota_exceeded',
      message: `Storage quota exceeded. ${formatBytes(quota.remainingBytes)} remaining of ${formatBytes(quota.quotaBytes)}.`,
      usage: quota,
    });
  }

  // Load provider credential
  const credential = await loadCredential(userId, provider);
  if (!credential) {
    return respond(400, {
      error: 'no_credential',
      message: `No API key configured for ${provider}. Add one at /account/providers.`,
    });
  }

  // Async path → SQS
  if (isAsync) {
    const job = await createJob({
      userId, voiceId, providerId: provider, inputText: text, inputMode: mode,
      voiceName: body.voiceName || null,
      status: 'pending',
    });

    await sqs.send(new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify({
        jobId: job.id,
        userId,
        voiceId,
        voiceName: body.voiceName,
        provider,
        providerVoiceId: body.providerVoiceId || '',
        text,
        mode,
        options,
      }),
    }));

    return respond(202, {
      jobId: job.id,
      status: 'pending',
      message: 'Job queued. Poll GET /v1/jobs/' + job.id + ' for status.',
    });
  }

  // Sync path → synthesize now
  const start = Date.now();

  const result = await adapter.synthesize(credential, {
    voiceId: voiceId || '',
    providerVoiceId: body.providerVoiceId || '',
    text,
    mode,
    format: options.format || 'mp3',
    options,
  });

  const latencyMs = Date.now() - start;

  // Upload to S3
  const jobId = generateId();
  const audioPath = `users/${userId}/synth/${jobId}.mp3`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: audioPath,
    Body: result.audio,
    ContentType: result.contentType || 'audio/mpeg',
  }));

  // Generate presigned URL (7 days)
  const audioUrl = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: BUCKET,
    Key: audioPath,
  }), { expiresIn: 604800 });

  const fileSizeBytes = result.audio.length;

  // Create job record
  const job = await createJob({
    userId,
    voiceId: voiceId || '',
    voiceName: body.voiceName || null,
    providerId: provider,
    inputText: text,
    inputMode: mode,
    status: 'completed',
    audioPath,
    audioUrl,
    fileSizeBytes,
    durationMs: result.durationMs || null,
    latencyMs,
  });

  // Increment usage
  await incrementUsage(userId, fileSizeBytes);

  return respond(200, {
    jobId: job.id,
    status: 'completed',
    audioUrl,
    fileSizeBytes,
    durationMs: result.durationMs || null,
    latencyMs,
    provider,
    voiceId: voiceId || null,
    voiceName: body.voiceName || null,
    createdAt: job.createdAtIso,
  });
}

// ─── GET /v1/jobs ───

async function handleListJobs(userId, event) {
  const params = event.queryStringParameters || {};
  const jobs = await listJobs(userId, {
    limit: Number(params.limit) || 50,
    status: params.status,
  });

  return respond(200, {
    jobs: jobs.map(formatJob),
    count: jobs.length,
  });
}

// ─── GET /v1/jobs/{id} ───

async function handleGetJob(userId, jobId) {
  const job = await getJob(userId, jobId);
  if (!job) return respond(404, { error: 'Job not found' });

  // Refresh presigned URL if audioPath exists
  if (job.audioPath) {
    job.audioUrl = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: BUCKET,
      Key: job.audioPath,
    }), { expiresIn: 604800 });
  }

  return respond(200, formatJob(job));
}

// ─── PATCH /v1/jobs/{id} ───

async function handleUpdateJob(userId, jobId, event) {
  const job = await getJob(userId, jobId);
  if (!job) return respond(404, { error: 'Job not found' });

  const body = JSON.parse(event.body || '{}');
  const allowedFields = ['clipName', 'clipDescription', 'clipTags'];
  const updates = {};

  for (const field of allowedFields) {
    if (field in body) {
      if (field === 'clipTags') {
        if (!Array.isArray(body.clipTags)) return respond(400, { error: 'clipTags must be an array' });
        if (body.clipTags.length > 20) return respond(400, { error: 'Maximum 20 tags' });
        updates.clipTags = body.clipTags.map(String).slice(0, 20);
      } else {
        const val = body[field];
        updates[field] = typeof val === 'string' ? val.slice(0, 500) : null;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return respond(400, { error: 'No valid fields to update. Allowed: clipName, clipDescription, clipTags' });
  }

  await updateJob(jobId, updates);

  // Return updated job
  const updated = await getJob(userId, jobId);
  if (updated?.audioPath) {
    updated.audioUrl = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: BUCKET,
      Key: updated.audioPath,
    }), { expiresIn: 604800 });
  }
  return respond(200, formatJob(updated));
}

// ─── DELETE /v1/jobs/{id} ───

async function handleDeleteJob(userId, jobId) {
  const sizeBytes = await deleteJob(userId, jobId);
  if (sizeBytes > 0) {
    await decrementUsage(userId, sizeBytes);
  }
  return respond(200, { deleted: true, freedBytes: sizeBytes });
}

// ─── GET /v1/media/usage ───

async function handleGetUsage(userId) {
  const usage = await getUsage(userId);
  const quota = usage.quotaBytes || Number(process.env.MAX_QUOTA_BYTES) || 5368709120;
  return respond(200, {
    totalBytes: usage.totalBytes || 0,
    fileCount: usage.fileCount || 0,
    quotaBytes: quota,
    usagePercent: Math.round(((usage.totalBytes || 0) / quota) * 100),
    remainingBytes: Math.max(0, quota - (usage.totalBytes || 0)),
  });
}

// ─── POST /v1/keys ───

async function handleCreateKey(userId, event) {
  const body = JSON.parse(event.body || '{}');
  const result = await createApiKey(userId, body.label);
  return respond(201, result);
}

// ─── GET /v1/keys ───

async function handleListKeys(userId) {
  const keys = await listApiKeys(userId);
  return respond(200, { keys });
}

// ─── DELETE /v1/keys/{id} ───

async function handleDeleteKey(userId, keyId) {
  await revokeApiKey(userId, keyId);
  return respond(200, { revoked: true });
}

// ─── POST /v1/credentials ───

async function handleSaveCredential(userId, event) {
  const body = JSON.parse(event.body || '{}');
  const { providerId, credentialData, label } = body;

  if (!providerId) return respond(400, { error: 'providerId is required' });
  if (!credentialData || typeof credentialData !== 'object') {
    return respond(400, { error: 'credentialData object is required' });
  }

  try {
    const result = await saveCredential(userId, providerId, credentialData, label);
    return respond(200, result);
  } catch (err) {
    return respond(err.statusCode || 400, {
      error: err.message,
      ...(err.supported ? { supported: err.supported } : {}),
    });
  }
}

// ─── GET /v1/credentials ───

async function handleListCredentials(userId) {
  const credentials = await listCredentials(userId);
  return respond(200, { credentials, count: credentials.length });
}

// ─── DELETE /v1/credentials/{providerId} ───

async function handleDeleteCredential(userId, providerId) {
  try {
    const result = await deleteCredential(userId, providerId);
    return respond(200, result);
  } catch (err) {
    return respond(err.statusCode || 400, { error: err.message });
  }
}

// ─── POST /v1/credentials/test ───

async function handleTestCredential(userId, event) {
  const body = JSON.parse(event.body || '{}');
  const { providerId, credentialData } = body;

  if (!providerId) return respond(400, { error: 'providerId is required' });
  if (!credentialData || typeof credentialData !== 'object') {
    return respond(400, { error: 'credentialData object is required' });
  }

  const result = await testCredential(providerId, credentialData, adapters);
  return respond(200, result);
}

// ─── GET /v1/providers ───

async function handleListProviders(userId, event) {
  const params = event.queryStringParameters || {};
  const showAll = params.all === 'true';

  if (showAll) {
    const providers = getAllProviders();
    return respond(200, { providers, count: providers.length });
  }

  // Only providers the user has active credentials for
  const enabledIds = await getEnabledProviderIds(userId);
  const providers = getEnabledProviders(enabledIds);
  return respond(200, { providers, count: providers.length, enabledOnly: true });
}

// ─── GET /v1/voices ───

async function handleListVoices(userId, event) {
  const params = event.queryStringParameters || {};
  const enabledIds = await getEnabledProviderIds(userId);

  if (enabledIds.size === 0) {
    return respond(200, {
      voices: [],
      total: 0,
      limit: 100,
      offset: 0,
      message: 'No providers configured. Add credentials at /account/providers or POST /v1/credentials.',
    });
  }

  const result = queryVoices(enabledIds, {
    provider: params.provider,
    language: params.language,
    gender: params.gender,
    quality: params.quality,
    search: params.search,
    limit: params.limit,
    offset: params.offset,
  });

  return respond(200, result);
}

// ─── GET /v1/voices/{id} ───

async function handleGetVoice(userId, voiceId) {
  const enabledIds = await getEnabledProviderIds(userId);
  const voice = getVoiceById(enabledIds, voiceId);

  if (!voice) {
    return respond(404, {
      error: 'Voice not found',
      message: 'Voice does not exist or belongs to a provider you have not configured.',
    });
  }

  return respond(200, voice);
}

// ─── Helpers ───

/**
 * Get the set of provider IDs the user has access to:
 * - Cloud providers with active credentials
 * - All open_model providers (no credentials needed)
 * @param {string} userId
 * @returns {Promise<Set<string>>}
 */
async function getEnabledProviderIds(userId) {
  const credentials = await listCredentials(userId);
  const ids = new Set(
    credentials
      .filter(c => c.status === 'active')
      .map(c => c.providerId)
  );

  // Include all open model providers — they don't require credentials
  for (const p of getAllProviders()) {
    if (p.type === 'open_model') {
      ids.add(p.id);
    }
  }

  return ids;
}

async function loadCredential(userId, providerId) {
  // Scan UserProviderCredential table for this user + provider
  // The table uses Amplify owner format: "owner" field = "{sub}::{sub}"
  const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');

  const result = await ddb.send(new ScanCommand({
    TableName: CREDENTIAL_TABLE,
    FilterExpression: 'begins_with(#owner, :ownerPrefix) AND providerId = :pid AND #status = :active',
    ExpressionAttributeNames: { '#owner': 'owner', '#status': 'status' },
    ExpressionAttributeValues: {
      ':ownerPrefix': `${userId}::`,
      ':pid': providerId,
      ':active': 'active',
    },
    // No Limit — DynamoDB Limit caps items *scanned*, not *returned*.
    // With Limit:1 the scan may examine a non-matching item and return 0 results.
  }));

  if (!result.Items?.length) return null;

  const item = result.Items[0];
  try {
    return JSON.parse(item.credentialData);
  } catch {
    return null;
  }
}

function formatJob(job) {
  return {
    jobId: job.id,
    voiceId: job.voiceId,
    voiceName: job.voiceName,
    provider: job.providerId,
    status: job.status,
    inputText: job.inputText,
    inputMode: job.inputMode,
    clipName: job.clipName || null,
    clipDescription: job.clipDescription || null,
    clipTags: job.clipTags || [],
    audioUrl: job.audioUrl,
    fileSizeBytes: job.fileSizeBytes,
    durationMs: job.durationMs,
    latencyMs: job.latencyMs,
    errorMessage: job.errorMessage,
    createdAt: job.createdAtIso,
  };
}

function generateId() {
  const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let t = Date.now();
  let ts = '';
  for (let i = 0; i < 10; i++) { ts = CROCKFORD[t % 32] + ts; t = Math.floor(t / 32); }
  const rand = randomBytes(10);
  let rs = '';
  for (const b of rand) rs += CROCKFORD[b % 32];
  return ts + rs;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
      'access-control-allow-headers': 'Authorization,Content-Type',
    },
    body: JSON.stringify(body),
  };
}
