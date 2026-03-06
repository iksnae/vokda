/**
 * ElevenLabs TTS adapter (server-side).
 * POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
 */

import { extractVoiceId } from './types.mjs';

export const id = 'elevenlabs';

export async function synthesize(credential, params) {
  const voiceId = params.providerVoiceId || extractVoiceId(params.voiceId);
  const modelId = params.options?.model_id || 'eleven_multilingual_v2';

  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': credential.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: params.text,
        model_id: modelId,
        voice_settings: {
          stability: params.options?.stability ?? 0.5,
          similarity_boost: params.options?.similarity_boost ?? 0.75,
        },
      }),
    }
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`ElevenLabs TTS ${resp.status}: ${body}`);
  }

  const audio = Buffer.from(await resp.arrayBuffer());
  return { audio, contentType: 'audio/mpeg', metadata: { modelId } };
}
