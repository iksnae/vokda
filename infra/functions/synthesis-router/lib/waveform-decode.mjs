/**
 * Decode an MP3 buffer to mono PCM for waveform peak computation.
 *
 * Uses the mpg123-decoder WASM decoder (works in the Node Lambda runtime). Audio
 * is decoded and downmixed to a single Float32Array in [-1, 1]. Separate from
 * audio-duration.mjs, which only reads frame headers (no samples).
 *
 * See specs/feat-clip-waveform.md.
 */

import { MPEGDecoder } from 'mpg123-decoder';

/**
 * @param {Buffer|Uint8Array} buffer  MP3 bytes
 * @returns {Promise<{ pcm: Float32Array, sampleRate: number }>}
 */
export async function decodeMp3ToMono(buffer) {
  const decoder = new MPEGDecoder();
  await decoder.ready;
  try {
    const { channelData, sampleRate } = decoder.decode(new Uint8Array(buffer));
    if (!channelData || channelData.length === 0) {
      return { pcm: new Float32Array(0), sampleRate: 0 };
    }
    if (channelData.length === 1) {
      return { pcm: channelData[0], sampleRate };
    }
    // Downmix to mono.
    const len = channelData[0].length;
    const mono = new Float32Array(len);
    for (let i = 0; i < len; i += 1) {
      let sum = 0;
      for (const ch of channelData) sum += ch[i];
      mono[i] = sum / channelData.length;
    }
    return { pcm: mono, sampleRate };
  } finally {
    decoder.free();
  }
}
