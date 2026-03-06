/**
 * Audio CDN helper.
 *
 * When PUBLIC_AUDIO_BASE_URL is set (production), audio is served from S3.
 * When unset (local dev), audio falls back to static files in /audio/samples/.
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
