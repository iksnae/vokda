/**
 * Voice steerability capability — server-side resolver for the voice API.
 *
 * Mirrors apps/web/src/lib/synthesis/provider-steering.ts so /v1/voices can tell
 * API consumers what expressivity control each voice supports and which
 * `options.*` to send. Keep the two in sync; the specs are the source of truth
 * (feat-openai-refresh-and-steerability / feat-steerability-*).
 */

const POLLY_NEWSCASTER_VOICES = new Set(['Matthew', 'Joanna', 'Lupe', 'Amy']);

const ELEVENLABS_SETTINGS = [
  { key: 'stability', min: 0, max: 1, default: 0.5 },
  { key: 'similarity_boost', min: 0, max: 1, default: 0.75 },
  { key: 'style', min: 0, max: 1, default: 0 },
  { key: 'speed', min: 0.7, max: 1.2, default: 1 },
];

/**
 * @param {{ providerId?: string, providerVoiceId?: string }} voice
 * @returns {object} steering descriptor (kind: instructions|styles|settings|none)
 */
export function getVoiceSteering(voice) {
  switch (voice.providerId) {
    case 'openai':
      return {
        kind: 'instructions',
        param: 'instructions',
        hint: 'Free-text delivery direction (gpt-4o-mini-tts), e.g. "warm and excited; speak slowly".',
      };
    case 'elevenlabs':
      return {
        kind: 'settings',
        param: 'voice_settings',
        settings: ELEVENLABS_SETTINGS,
        // Audio tags ([whispers], [excited], …) are honored by eleven_v3; pass
        // `options.model_id: "eleven_v3"` and put tags inline in the text.
        audioTagsModel: 'eleven_v3',
      };
    case 'aws-polly':
      if (voice.providerVoiceId && POLLY_NEWSCASTER_VOICES.has(voice.providerVoiceId)) {
        return { kind: 'styles', param: 'speakingStyle', options: ['default', 'newscaster'] };
      }
      return { kind: 'none' };
    default:
      return { kind: 'none' };
  }
}
