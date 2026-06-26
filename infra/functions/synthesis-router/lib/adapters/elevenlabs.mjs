/**
 * ElevenLabs TTS adapter (server-side).
 * POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
 */

import { extractVoiceId } from './types.mjs';

export const id = 'elevenlabs';

function clamp(value, min, max, fallback) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Build the ElevenLabs voice_settings from request options. Only includes
 * optional fields (style/use_speaker_boost/speed) when provided so we don't
 * change behaviour for callers that don't steer. All values clamped to the
 * documented ranges.
 */
export function buildVoiceSettings(options = {}) {
  const settings = {
    stability: clamp(options.stability, 0, 1, 0.5),
    similarity_boost: clamp(options.similarity_boost, 0, 1, 0.75),
  };
  if (options.style != null) settings.style = clamp(options.style, 0, 1, 0);
  if (options.use_speaker_boost != null) settings.use_speaker_boost = Boolean(options.use_speaker_boost);
  if (options.speed != null) settings.speed = clamp(options.speed, 0.25, 4, 1);
  return settings;
}

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
        // Audio tags ([whispers], [excited], …) ride inline in `text`; the
        // eleven_v3 model interprets them, others speak/strip them.
        text: params.text,
        model_id: modelId,
        voice_settings: buildVoiceSettings(params.options),
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
