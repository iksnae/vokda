/**
 * Google Cloud TTS adapter (server-side).
 * POST https://texttospeech.googleapis.com/v1/text:synthesize
 */

import { extractVoiceId } from './types.mjs';

export const id = 'gcp-tts';

export async function synthesize(credential, params) {
  const voiceName = params.providerVoiceId || extractVoiceId(params.voiceId) || 'en-US-Wavenet-D';
  const parts = voiceName.split('-');
  const languageCode = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : 'en-US';

  const resp = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${credential.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: params.mode === 'ssml' ? { ssml: params.text } : { text: params.text },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    }
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Google Cloud TTS ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  const audio = Buffer.from(data.audioContent, 'base64');

  return {
    audio,
    contentType: 'audio/mpeg',
    metadata: { voiceName, languageCode },
  };
}
