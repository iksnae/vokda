/**
 * Audio CDN helper.
 *
 * Currently audio is served from Amplify Hosting's built-in CDN via static files.
 * When PUBLIC_AUDIO_BASE_URL is set, audio can be served from an external CDN/S3.
 * The S3 bucket (vokdaAudio) is provisioned but has public access blocked by default —
 * it's intended for user-generated audio (BYOK synthesis) rather than catalog assets.
 *
 * For catalog assets, Amplify Hosting CDN is free and sufficient at current scale.
 */

const AUDIO_BASE: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_AUDIO_BASE_URL
    ? String(import.meta.env.PUBLIC_AUDIO_BASE_URL)
    : '') ?? '';

/**
 * Resolve audio URL for a voice ID.
 * Uses the environment-configured base URL, falling back to static path.
 */
export function audioUrl(voiceId: string): string {
  return audioUrlWithBase(AUDIO_BASE, voiceId);
}

/**
 * Pure function for resolving audio URL with an explicit base.
 * Useful for testing and for scripts that don't run in Vite context.
 */
export function audioUrlWithBase(base: string, voiceId: string): string {
  if (base) {
    // Remove trailing slash if present
    const cleanBase = base.replace(/\/+$/, '');
    return `${cleanBase}/catalog/${voiceId}.mp3`;
  }
  return `/audio/samples/${voiceId}.mp3`;
}
