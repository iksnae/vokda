/**
 * Tests for computeWaveform. Run with: node --test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWaveform } from './waveform.mjs';

test('silence → all-zero data', () => {
  const w = computeWaveform(new Float32Array(1000), { buckets: 10 });
  assert.equal(w.length, 10);
  assert.equal(w.data.length, 20);
  assert.ok(w.data.every((v) => v === 0));
});

test('honors bucket count; captures the envelope of a full-scale sine', () => {
  const pcm = new Float32Array(1000);
  for (let i = 0; i < 1000; i += 1) pcm[i] = Math.sin(i / 5);
  const w = computeWaveform(pcm, { buckets: 50, bits: 8 });
  assert.equal(w.length, 50);
  assert.equal(w.data.length, 100);
  assert.ok(Math.max(...w.data) >= 120);
  assert.ok(Math.min(...w.data) <= -120);
});

test('quantizes full-scale to the bit range (8-bit → ±127)', () => {
  const w = computeWaveform(new Float32Array([1, -1, 1, -1]), { buckets: 1, bits: 8 });
  assert.equal(w.data[0], -127); // min
  assert.equal(w.data[1], 127); // max
});

test('clamps out-of-range samples', () => {
  const w = computeWaveform(new Float32Array([2, -2]), { buckets: 1, bits: 8 });
  assert.equal(w.data[0], -127);
  assert.equal(w.data[1], 127);
});

test('empty pcm → length 0, empty data', () => {
  const w = computeWaveform(new Float32Array(0), { buckets: 10 });
  assert.equal(w.length, 0);
  assert.deepEqual(w.data, []);
});

test('carries sample_rate, samples_per_pixel, bits, channels', () => {
  const w = computeWaveform(new Float32Array(1000), { buckets: 10, sampleRate: 24000 });
  assert.equal(w.sample_rate, 24000);
  assert.equal(w.samples_per_pixel, 100);
  assert.equal(w.bits, 8);
  assert.equal(w.channels, 1);
  assert.equal(w.version, 2);
});
