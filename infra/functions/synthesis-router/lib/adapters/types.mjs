/**
 * Provider adapter types and shared utilities.
 *
 * Each adapter exports: { id, synthesize(credential, params) → { audio, contentType, durationMs } }
 */

/**
 * @typedef {Object} SynthesisParams
 * @property {string} voiceId - Vokda voice ID
 * @property {string} providerVoiceId - Provider-specific voice identifier
 * @property {string} text - Input text to synthesize
 * @property {'text'|'ssml'} mode - Input mode
 * @property {'mp3'|'wav'} [format='mp3'] - Output audio format
 * @property {Record<string, unknown>} [options] - Provider-specific options
 */

/**
 * @typedef {Object} SynthesisResult
 * @property {Buffer} audio - Audio data
 * @property {string} contentType - MIME type (audio/mpeg, audio/wav)
 * @property {number} [durationMs] - Audio duration in ms (if known)
 * @property {Record<string, unknown>} [metadata] - Provider-specific metadata
 */

/**
 * Extract the provider-specific voice ID from a sourceKey.
 * e.g., "openai:tts:alloy" → "alloy"
 * @param {string} sourceKey
 * @returns {string}
 */
export function extractVoiceId(sourceKey) {
  const parts = sourceKey.split(':');
  return parts[parts.length - 1] || '';
}
