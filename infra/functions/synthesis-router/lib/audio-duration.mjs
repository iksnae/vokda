/**
 * Estimate audio duration from rendered bytes.
 *
 * Every provider adapter currently returns MP3 (audio/mpeg); a few may
 * return WAV. Providers don't report duration, so we derive it from the
 * encoded audio: MP3 by summing per-frame sample counts (correct for both
 * CBR and VBR), WAV from the header. Returns milliseconds, or null when the
 * format is unrecognized or the bytes can't be parsed — callers fall back to
 * null rather than a wrong number.
 *
 * See issue #6.
 */

// Bitrate tables in kbps, indexed by the 4-bit bitrate field.
// 0 = "free"/invalid, which we treat as unparseable.
const BITRATES = {
  // MPEG Version 1
  '1-1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],
  '1-2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
  '1-3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  // MPEG Version 2 & 2.5
  '2-1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
  '2-2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
  '2-3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};

const SAMPLE_RATES = {
  1: [44100, 48000, 32000], // MPEG 1
  2: [22050, 24000, 16000], // MPEG 2
  25: [11025, 12000, 8000], // MPEG 2.5
};

// Samples per frame by [mpegGeneration][layer]. Generation: 1 = MPEG1,
// 2 = MPEG2/2.5. Layer III differs between the two generations.
const SAMPLES_PER_FRAME = {
  1: { 1: 384, 2: 1152, 3: 1152 },
  2: { 1: 384, 2: 1152, 3: 576 },
};

/**
 * Skip a leading ID3v2 tag if present, returning the offset of the first
 * audio byte. ID3v2 size is stored as a 28-bit synchsafe integer.
 */
function audioStartOffset(buffer) {
  if (buffer.length >= 10 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    const size =
      (buffer[6] & 0x7f) * 0x200000 +
      (buffer[7] & 0x7f) * 0x4000 +
      (buffer[8] & 0x7f) * 0x80 +
      (buffer[9] & 0x7f);
    return 10 + size;
  }
  return 0;
}

function mp3DurationMs(buffer) {
  let offset = audioStartOffset(buffer);
  let totalSeconds = 0;
  let framesParsed = 0;

  while (offset + 4 <= buffer.length) {
    // Frame sync: 11 set bits (0xFFE).
    if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) {
      offset += 1; // resync
      continue;
    }

    const versionBits = (buffer[offset + 1] >> 3) & 0x03; // 00=2.5, 10=2, 11=1
    const layerBits = (buffer[offset + 1] >> 1) & 0x03; // 01=III, 10=II, 11=I
    const bitrateIndex = (buffer[offset + 2] >> 4) & 0x0f;
    const sampleRateIndex = (buffer[offset + 2] >> 2) & 0x03;
    const padding = (buffer[offset + 2] >> 1) & 0x01;

    // Reserved values → not a valid frame; resync one byte.
    if (versionBits === 1 || layerBits === 0 || bitrateIndex === 0 || sampleRateIndex === 3) {
      offset += 1;
      continue;
    }

    const mpegVersion = versionBits === 3 ? 1 : versionBits === 2 ? 2 : 25;
    const layer = 4 - layerBits; // 11→1, 10→2, 01→3
    const generation = mpegVersion === 1 ? 1 : 2;

    const bitrate = BITRATES[`${generation}-${layer}`][bitrateIndex] * 1000;
    const sampleRate = SAMPLE_RATES[mpegVersion][sampleRateIndex];
    const samplesPerFrame = SAMPLES_PER_FRAME[generation][layer];
    if (!bitrate || !sampleRate) {
      offset += 1;
      continue;
    }

    const frameLength =
      layer === 1
        ? (Math.floor((12 * bitrate) / sampleRate) + padding) * 4
        : Math.floor((samplesPerFrame / 8 * bitrate) / sampleRate) + padding;
    if (frameLength <= 0) {
      offset += 1;
      continue;
    }

    totalSeconds += samplesPerFrame / sampleRate;
    framesParsed += 1;
    offset += frameLength;
  }

  if (framesParsed === 0) return null;
  return Math.round(totalSeconds * 1000);
}

function wavDurationMs(buffer) {
  // RIFF/WAVE header check.
  if (
    buffer.length < 44 ||
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    return null;
  }

  // Walk chunks to find "fmt " and "data".
  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === 'fmt ') {
      // fmt body: +8 audioFormat, +10 channels, +12 sampleRate, +16 byteRate
      byteRate = buffer.readUInt32LE(offset + 16);
    } else if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }

  if (!byteRate || !dataSize) return null;
  return Math.round((dataSize / byteRate) * 1000);
}

/**
 * @param {Buffer} audio - Rendered audio bytes.
 * @param {string} [contentType] - MIME type from the adapter (audio/mpeg, audio/wav).
 * @returns {number|null} Duration in milliseconds, or null if undeterminable.
 */
export function estimateAudioDurationMs(audio, contentType) {
  if (!audio || audio.length === 0) return null;

  const type = (contentType || '').toLowerCase();
  if (type.includes('wav') || type.includes('x-wav')) {
    return wavDurationMs(audio);
  }
  if (type.includes('mpeg') || type.includes('mp3')) {
    return mp3DurationMs(audio);
  }

  // Unknown/missing content type: sniff the bytes.
  if (audio.length >= 4 && audio.toString('ascii', 0, 4) === 'RIFF') {
    return wavDurationMs(audio);
  }
  return mp3DurationMs(audio);
}
