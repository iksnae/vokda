/**
 * Tests for absolutizeCatalogUrl. Run with: node --test
 *
 * The catalog stores audio/image URLs as site-relative paths. The /v1/voices
 * API is served from api.vokda.iksnae.com, but those assets only exist on the
 * apex (vokda.iksnae.com). A relative URL therefore resolves against the wrong
 * host for API consumers and 404s, so the API must advertise absolute apex
 * URLs. See issue #11.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { absolutizeCatalogUrl, CATALOG_BASE_URL } from './voices.mjs';

test('prepends the apex base to a site-relative path', () => {
  assert.equal(
    absolutizeCatalogUrl('/audio/samples/01KJZXZNFBFVKZXVAESYST9MN8.mp3'),
    `${CATALOG_BASE_URL}/audio/samples/01KJZXZNFBFVKZXVAESYST9MN8.mp3`
  );
});

test('leaves an absolute https URL unchanged', () => {
  const url = 'https://cdn.example.com/audio/x.mp3';
  assert.equal(absolutizeCatalogUrl(url), url);
});

test('leaves an absolute http URL unchanged', () => {
  const url = 'http://cdn.example.com/audio/x.mp3';
  assert.equal(absolutizeCatalogUrl(url), url);
});

test('leaves a protocol-relative URL unchanged', () => {
  const url = '//cdn.example.com/audio/x.mp3';
  assert.equal(absolutizeCatalogUrl(url), url);
});

test('returns null for null, undefined, or empty input', () => {
  assert.equal(absolutizeCatalogUrl(null), null);
  assert.equal(absolutizeCatalogUrl(undefined), null);
  assert.equal(absolutizeCatalogUrl(''), null);
});
