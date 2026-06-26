/**
 * Tests for buildVoiceSettings. Run with: node --test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVoiceSettings } from './elevenlabs.mjs';

test('defaults stability/similarity when not provided; omits optional fields', () => {
  const vs = buildVoiceSettings({});
  assert.equal(vs.stability, 0.5);
  assert.equal(vs.similarity_boost, 0.75);
  assert.equal('style' in vs, false);
  assert.equal('speed' in vs, false);
  assert.equal('use_speaker_boost' in vs, false);
});

test('includes optional fields when provided', () => {
  const vs = buildVoiceSettings({ style: 0.3, speed: 1.1, use_speaker_boost: false });
  assert.equal(vs.style, 0.3);
  assert.equal(vs.speed, 1.1);
  assert.equal(vs.use_speaker_boost, false);
});

test('clamps values to documented ranges', () => {
  const vs = buildVoiceSettings({ stability: 5, similarity_boost: -1, style: 9, speed: 99 });
  assert.equal(vs.stability, 1);
  assert.equal(vs.similarity_boost, 0);
  assert.equal(vs.style, 1);
  assert.equal(vs.speed, 4);
});

test('falls back to defaults on non-numeric input', () => {
  const vs = buildVoiceSettings({ stability: 'oops' });
  assert.equal(vs.stability, 0.5);
});
