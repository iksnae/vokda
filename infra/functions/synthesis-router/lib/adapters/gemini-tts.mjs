/**
 * Gemini TTS adapter (server-side).
 * Uses Gemini 2.5 Flash Preview TTS via generateContent.
 */

import { extractVoiceId } from './types.mjs';

export const id = 'gemini-tts';

export async function synthesize(credential, params) {
  const voice = params.providerVoiceId || extractVoiceId(params.voiceId) || 'Kore';

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${credential.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: params.text }] }],
        generationConfig: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: { voice_name: voice },
            },
          },
        },
      }),
    }
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Gemini TTS ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  const audioPart = data.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.mimeType?.startsWith('audio/')
  );

  if (!audioPart?.inlineData) {
    throw new Error('Gemini TTS returned no audio data');
  }

  const audio = Buffer.from(audioPart.inlineData.data, 'base64');

  return {
    audio,
    contentType: audioPart.inlineData.mimeType || 'audio/mpeg',
    metadata: { voice },
  };
}
