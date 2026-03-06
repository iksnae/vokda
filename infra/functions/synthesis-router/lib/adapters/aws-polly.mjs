/**
 * AWS Polly adapter (server-side).
 *
 * Uses the AWS SDK PollyClient with user-provided IAM credentials.
 * Credential format: { accessKeyId, secretAccessKey, region? }
 *
 * The Lambda runtime includes @aws-sdk/* so no extra dependencies needed.
 */

import { extractVoiceId } from './types.mjs';

export const id = 'aws-polly';

export async function synthesize(credential, params) {
  const { PollyClient, SynthesizeSpeechCommand } = await import('@aws-sdk/client-polly');

  const voiceId = params.providerVoiceId || extractVoiceId(params.voiceId) || 'Joanna';
  const region = credential.region || 'us-east-1';

  const client = new PollyClient({
    region,
    credentials: {
      accessKeyId: credential.accessKeyId,
      secretAccessKey: credential.secretAccessKey,
    },
  });

  // Determine engine — neural voices use "neural", long-form use "long-form",
  // generative voices use "generative". Default to neural for standard voices.
  const engine = credential.engine || params.options?.engine || 'neural';

  const input = {
    OutputFormat: 'mp3',
    VoiceId: voiceId,
    Engine: engine,
  };

  if (params.mode === 'ssml') {
    input.TextType = 'ssml';
    input.Text = params.text;
  } else {
    input.TextType = 'text';
    input.Text = params.text;
  }

  let resp;
  try {
    resp = await client.send(new SynthesizeSpeechCommand(input));
  } catch (err) {
    // Try falling back to standard engine if neural isn't available for this voice
    if (engine === 'neural' && err.name === 'InvalidParameterValueException') {
      input.Engine = 'standard';
      resp = await client.send(new SynthesizeSpeechCommand(input));
    } else {
      throw new Error(`AWS Polly ${err.name || 'error'}: ${err.message}`);
    }
  }

  if (!resp.AudioStream) {
    throw new Error('AWS Polly returned no audio stream');
  }

  // AudioStream is a readable stream — collect it into a Buffer
  const chunks = [];
  for await (const chunk of resp.AudioStream) {
    chunks.push(chunk);
  }
  const audio = Buffer.concat(chunks);

  return {
    audio,
    contentType: 'audio/mpeg',
    metadata: {
      voiceId,
      engine: input.Engine,
      region,
    },
  };
}
