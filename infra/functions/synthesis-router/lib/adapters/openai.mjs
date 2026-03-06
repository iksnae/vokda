/**
 * OpenAI TTS adapter (server-side).
 * POST https://api.openai.com/v1/audio/speech
 */

import { extractVoiceId } from './types.mjs';

export const id = 'openai';

/**
 * @param {{ apiKey: string }} credential
 * @param {import('./types.mjs').SynthesisParams} params
 * @returns {Promise<import('./types.mjs').SynthesisResult>}
 */
export async function synthesize(credential, params) {
  const voice = params.providerVoiceId || extractVoiceId(params.voiceId);
  const model = params.options?.model || 'tts-1';
  const speed = params.options?.speed || 1.0;

  const resp = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credential.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: params.text,
      response_format: params.format || 'mp3',
      speed,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`OpenAI TTS ${resp.status}: ${body}`);
  }

  const audio = Buffer.from(await resp.arrayBuffer());

  return {
    audio,
    contentType: 'audio/mpeg',
    metadata: { model, voice, speed },
  };
}
