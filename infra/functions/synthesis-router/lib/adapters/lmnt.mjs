/**
 * LMNT TTS adapter (server-side).
 * POST https://api.lmnt.com/v1/ai/speech
 */

import { extractVoiceId } from './types.mjs';

export const id = 'lmnt';

export async function synthesize(credential, params) {
  const voice = params.providerVoiceId || extractVoiceId(params.voiceId);

  const formData = new URLSearchParams();
  formData.append('voice', voice);
  formData.append('text', params.text);
  formData.append('format', 'mp3');

  const resp = await fetch('https://api.lmnt.com/v1/ai/speech', {
    method: 'POST',
    headers: {
      'X-API-Key': credential.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`LMNT TTS ${resp.status}: ${body}`);
  }

  const audio = Buffer.from(await resp.arrayBuffer());

  return {
    audio,
    contentType: 'audio/mpeg',
    metadata: { voice },
  };
}
