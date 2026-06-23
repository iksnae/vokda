/**
 * Tests for estimateAudioDurationMs. Run with: node --test
 *
 * WAV buffers are constructed by hand (deterministic, no ffmpeg). MP3 frame
 * parsing is validated separately against real encoder output; here we cover
 * the WAV header math, content-type routing, and the null fallbacks.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateAudioDurationMs } from './audio-duration.mjs';

/** Build a minimal PCM WAV of the given duration. */
function makeWav({ seconds, sampleRate = 24000, channels = 1, bitsPerSample = 16 }) {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const dataSize = Math.round(byteRate * seconds);
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16); // fmt chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE((channels * bitsPerSample) / 8, 32); // block align
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

test('WAV duration from header (mono 24kHz)', () => {
  assert.equal(estimateAudioDurationMs(makeWav({ seconds: 2 }), 'audio/wav'), 2000);
});

test('WAV duration is channel/rate independent (stereo 44.1kHz)', () => {
  const wav = makeWav({ seconds: 1.5, sampleRate: 44100, channels: 2 });
  assert.equal(estimateAudioDurationMs(wav, 'audio/wav'), 1500);
});

test('WAV detected by byte sniff when content type is missing', () => {
  assert.equal(estimateAudioDurationMs(makeWav({ seconds: 3 }), ''), 3000);
});

test('empty buffer returns null', () => {
  assert.equal(estimateAudioDurationMs(Buffer.alloc(0), 'audio/mpeg'), null);
});

test('non-audio bytes return null rather than a wrong number', () => {
  assert.equal(estimateAudioDurationMs(Buffer.from('this is not audio data'), 'audio/mpeg'), null);
});

test('truncated WAV (header only, no data) returns null', () => {
  const headerOnly = makeWav({ seconds: 0 });
  assert.equal(estimateAudioDurationMs(headerOnly, 'audio/wav'), null);
});
