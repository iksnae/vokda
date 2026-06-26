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

/** Voices that support the newscaster speaking style (neural engine only). */
export const NEWSCASTER_VOICES = new Set(['Matthew', 'Joanna', 'Lupe', 'Amy']);

function escapeSsml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Wrap text in the newscaster SSML style. For SSML input, unwrap an existing
 * outer <speak> before re-wrapping; for plain text, entity-escape it.
 */
export function wrapNewscasterSsml(text, mode) {
  let inner = String(text ?? '');
  if (mode === 'ssml') {
    inner = inner.replace(/^\s*<speak[^>]*>/i, '').replace(/<\/speak>\s*$/i, '');
  } else {
    inner = escapeSsml(inner);
  }
  return `<speak><amazon:domain name="news">${inner}</amazon:domain></speak>`;
}

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

  // Newscaster speaking style — neural engine only, on the 4 supported voices.
  const useNewscaster =
    params.options?.speakingStyle === 'newscaster' && NEWSCASTER_VOICES.has(voiceId);

  // Determine engine — neural voices use "neural", long-form use "long-form",
  // generative voices use "generative". Default to neural for standard voices.
  // Newscaster forces neural.
  const engine = useNewscaster ? 'neural' : (credential.engine || params.options?.engine || 'neural');

  const input = {
    OutputFormat: 'mp3',
    VoiceId: voiceId,
    Engine: engine,
  };

  if (useNewscaster) {
    input.TextType = 'ssml';
    input.Text = wrapNewscasterSsml(params.text, params.mode);
  } else if (params.mode === 'ssml') {
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
