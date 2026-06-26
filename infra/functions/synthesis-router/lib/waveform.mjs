/**
 * Compute a downsampled waveform (peaks) from decoded mono PCM.
 *
 * Output matches the BBC `audiowaveform` JSON shape so clients can render it
 * directly (peaks.js / wavesurfer) or draw the interleaved min/max pairs on a
 * canvas — no audio decoding on the client. Pure and side-effect-free.
 *
 * See specs/feat-clip-waveform.md.
 */

/**
 * @param {Float32Array} pcm  mono samples in [-1, 1]
 * @param {{ buckets?: number, bits?: number, sampleRate?: number }} [opts]
 * @returns {{ version: number, channels: number, sample_rate: number,
 *             samples_per_pixel: number, bits: number, length: number, data: number[] }}
 */
export function computeWaveform(pcm, { buckets = 500, bits = 8, sampleRate = 0 } = {}) {
  const n = pcm.length;
  const peak = (1 << (bits - 1)) - 1; // 127 for 8-bit
  const quant = (s) => Math.round(Math.max(-1, Math.min(1, s)) * peak);

  if (n === 0) {
    return { version: 2, channels: 1, sample_rate: sampleRate, samples_per_pixel: 0, bits, length: 0, data: [] };
  }

  const samplesPerPixel = Math.max(1, Math.floor(n / buckets));
  const length = Math.ceil(n / samplesPerPixel);
  const data = new Array(length * 2);

  for (let i = 0; i < length; i += 1) {
    const start = i * samplesPerPixel;
    const end = Math.min(start + samplesPerPixel, n);
    let min = Infinity;
    let max = -Infinity;
    for (let j = start; j < end; j += 1) {
      const s = pcm[j];
      if (s < min) min = s;
      if (s > max) max = s;
    }
    if (min === Infinity) { min = 0; max = 0; }
    data[i * 2] = quant(min);
    data[i * 2 + 1] = quant(max);
  }

  return { version: 2, channels: 1, sample_rate: sampleRate, samples_per_pixel: samplesPerPixel, bits, length, data };
}
