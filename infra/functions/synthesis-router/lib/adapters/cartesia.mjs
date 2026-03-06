/**
 * Cartesia TTS adapter (server-side).
 * POST https://api.cartesia.ai/tts/bytes
 */

import { extractVoiceId } from './types.mjs';

export const id = 'cartesia';

export async function synthesize(credential, params) {
  const voiceId = params.providerVoiceId || extractVoiceId(params.voiceId);

  const resp = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      'X-API-Key': credential.apiKey,
      'Cartesia-Version': '2024-06-10',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: 'sonic-2',
      transcript: params.text,
      voice: { mode: 'id', id: voiceId },
      output_format: {
        container: 'mp3',
        bit_rate: 128000,
        sample_rate: 44100,
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Cartesia TTS ${resp.status}: ${body}`);
  }

  const audio = Buffer.from(await resp.arrayBuffer());

  return {
    audio,
    contentType: 'audio/mpeg',
    metadata: { voiceId },
  };
}
