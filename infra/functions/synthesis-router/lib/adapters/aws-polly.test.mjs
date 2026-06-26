/**
 * Tests for wrapNewscasterSsml. Run with: node --test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapNewscasterSsml, NEWSCASTER_VOICES } from './aws-polly.mjs';

test('wraps plain text in the newscaster domain, entity-escaping it', () => {
  const out = wrapNewscasterSsml('Breaking: A & B < C', 'text');
  assert.match(out, /^<speak><amazon:domain name="news">/);
  assert.match(out, /<\/amazon:domain><\/speak>$/);
  assert.match(out, /A &amp; B &lt; C/);
});

test('unwraps an existing <speak> for ssml input before re-wrapping', () => {
  const out = wrapNewscasterSsml('<speak>Hello <break time="1s"/> world</speak>', 'ssml');
  assert.equal((out.match(/<speak>/g) || []).length, 1);
  assert.match(out, /<amazon:domain name="news">Hello <break time="1s"\/> world<\/amazon:domain>/);
});

test('exposes the supported voice set', () => {
  for (const v of ['Matthew', 'Joanna', 'Lupe', 'Amy']) assert.ok(NEWSCASTER_VOICES.has(v));
  assert.equal(NEWSCASTER_VOICES.has('Joey'), false);
});
