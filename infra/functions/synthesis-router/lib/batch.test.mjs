/**
 * Tests for batch synthesis item validation. Run with: node --test
 *
 * The batch endpoint validates each item independently and reports per-item
 * rejections rather than failing the whole request — this is that pure core.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBatchItem, MAX_BATCH_ITEMS, MAX_BATCH_TEXT_CHARS } from './batch.mjs';

const PROVIDERS = ['openai', 'elevenlabs', 'aws-polly'];

test('accepts a well-formed item', () => {
  const r = validateBatchItem({ provider: 'openai', text: 'Hello.' }, PROVIDERS);
  assert.equal(r.ok, true);
});

test('rejects missing/blank text', () => {
  assert.equal(validateBatchItem({ provider: 'openai', text: '' }, PROVIDERS).ok, false);
  assert.equal(validateBatchItem({ provider: 'openai', text: '   ' }, PROVIDERS).ok, false);
  assert.equal(validateBatchItem({ provider: 'openai' }, PROVIDERS).ok, false);
});

test('rejects text over the character limit', () => {
  const r = validateBatchItem({ provider: 'openai', text: 'x'.repeat(MAX_BATCH_TEXT_CHARS + 1) }, PROVIDERS);
  assert.equal(r.ok, false);
  assert.match(r.error, /character limit/);
});

test('rejects a missing or unsupported provider', () => {
  assert.equal(validateBatchItem({ text: 'hi' }, PROVIDERS).ok, false);
  const r = validateBatchItem({ provider: 'nope', text: 'hi' }, PROVIDERS);
  assert.equal(r.ok, false);
  assert.match(r.error, /unsupported provider/);
});

test('rejects a non-object item', () => {
  assert.equal(validateBatchItem(null, PROVIDERS).ok, false);
  assert.equal(validateBatchItem('text', PROVIDERS).ok, false);
});

test('exposes batch limits', () => {
  assert.equal(typeof MAX_BATCH_ITEMS, 'number');
  assert.ok(MAX_BATCH_ITEMS > 0);
  assert.equal(MAX_BATCH_TEXT_CHARS, 5000);
});
