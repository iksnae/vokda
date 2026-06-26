/**
 * Build the waveform peaks JSON for a rendered audio buffer.
 *
 * Orchestrates decode (MP3 → mono PCM) + computeWaveform (PCM → peaks). This is
 * the single entry point used by both the router (sync path) and the worker
 * (async path). It is FAIL-SAFE: any decode/compute error returns null so a
 * clip is never lost just because its waveform couldn't be built. Only MP3 is
 * decoded today; other content types return null.
 *
 * See specs/feat-clip-waveform.md.
 */

import { decodeMp3ToMono } from './waveform-decode.mjs';
import { computeWaveform } from './waveform.mjs';

/**
 * @param {Buffer|Uint8Array} audio  rendered audio bytes
 * @param {string} [contentType]     MIME type (default audio/mpeg)
 * @param {{ buckets?: number }} [opts]
 * @returns {Promise<object|null>} audiowaveform-shaped peaks, or null on failure
 */
export async function buildWaveform(audio, contentType = 'audio/mpeg', { buckets = 500 } = {}) {
  try {
    if (!audio || audio.length === 0) return null;
    const ct = (contentType || '').toLowerCase();
    if (!ct.includes('mpeg') && !ct.includes('mp3')) return null;
    const { pcm, sampleRate } = await decodeMp3ToMono(audio);
    if (!pcm || pcm.length === 0) return null;
    return computeWaveform(pcm, { buckets, sampleRate });
  } catch (err) {
    console.warn('Waveform generation failed:', err?.message || err);
    return null;
  }
}
