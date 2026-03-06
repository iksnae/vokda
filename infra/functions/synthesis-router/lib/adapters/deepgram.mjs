/**
 * Deepgram Aura TTS adapter (server-side).
 * POST https://api.deepgram.com/v1/speak
 */

import { extractVoiceId } from './types.mjs';

export const id = 'deepgram';

export async function synthesize(credential, params) {
  const model = params.providerVoiceId || extractVoiceId(params.voiceId);

  const resp = await fetch(
    `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${credential.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: params.text }),
    }
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Deepgram TTS ${resp.status}: ${body}`);
  }

  const audio = Buffer.from(await resp.arrayBuffer());
  return { audio, contentType: 'audio/mpeg', metadata: { model } };
}
