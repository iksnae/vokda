/**
 * Deepgram Aura TTS adapter (server-side).
 * POST https://api.deepgram.com/v1/speak
 */

import { extractVoiceId } from './types.mjs';

export const id = 'deepgram';

export async function synthesize(credential, params) {
  const model = params.providerVoiceId || extractVoiceId(params.voiceId);
  const text = params.text || '';

  // Deepgram Aura has a 2000-character input limit
  if (text.length > 2000) {
    throw new Error(`Deepgram TTS 400: Input text is ${text.length} characters — Deepgram supports a maximum of 2,000 characters per request.`);
  }

  const resp = await fetch(
    `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${credential.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    }
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Deepgram TTS ${resp.status}: ${body}`);
  }

  const audio = Buffer.from(await resp.arrayBuffer());
  return { audio, contentType: 'audio/mpeg', metadata: { model } };
}
