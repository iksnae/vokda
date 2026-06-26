/**
 * Tests for buildWaveform (decode + compute orchestration, fail-safe). Run with: node --test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWaveform } from './waveform-from-audio.mjs';

test('null/empty audio → null', async () => {
  assert.equal(await buildWaveform(null), null);
  assert.equal(await buildWaveform(Buffer.alloc(0)), null);
});

test('non-mp3 content type → null (no decode attempted)', async () => {
  assert.equal(await buildWaveform(Buffer.from([1, 2, 3]), 'audio/wav'), null);
});

test('undecodable mp3 bytes → null (fail-safe, no throw)', async () => {
  const garbage = Buffer.from(new Array(64).fill(0xff));
  const result = await buildWaveform(garbage, 'audio/mpeg');
  assert.equal(result, null);
});
