#!/usr/bin/env node
/**
 * Backfill metadata.genderPresentation from tags.
 *
 * Some voices (notably ElevenLabs premade voices) ship with
 * genderPresentation "unknown"/empty even though their own tags already
 * encode the gender. Provider discovery (scripts/discover-voices.mjs)
 * defaults to "unknown" when the provider API omits a gender label, but the
 * curated tag list still carries male/female/neutral.
 *
 * This script recovers that signal: when genderPresentation is missing and
 * the tags contain exactly one gender token, it adopts that token. Voices
 * with no gender token, or ambiguous tags (more than one token), are left
 * untouched so "unknown" continues to mean genuinely unknown.
 *
 * Idempotent — re-running makes no further changes. See issue #4.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const VOICES_PATH = join(import.meta.dirname, '..', 'apps/web/static/data/voices.json');
const GENDER_TOKENS = ['male', 'female', 'neutral'];

const catalog = JSON.parse(readFileSync(VOICES_PATH, 'utf-8'));

function isMissing(value) {
  return value === 'unknown' || value === '' || value === null || value === undefined;
}

function genderFromTags(tags) {
  const lowered = (tags ?? []).map((tag) => String(tag).toLowerCase());
  const matches = GENDER_TOKENS.filter((token) => lowered.includes(token));
  return matches.length === 1 ? matches[0] : null;
}

const changes = [];
const skipped = [];

for (const voice of catalog.voices) {
  const metadata = voice.metadata;
  if (!metadata || !isMissing(metadata.genderPresentation)) continue;

  const derived = genderFromTags(voice.tags);
  if (derived) {
    metadata.genderPresentation = derived;
    changes.push({ name: voice.name, provider: voice.provider, gender: derived });
  } else {
    skipped.push({ name: voice.name, provider: voice.provider });
  }
}

if (changes.length > 0) {
  writeFileSync(VOICES_PATH, JSON.stringify(catalog, null, 2) + '\n');
}

console.log(`Backfilled genderPresentation for ${changes.length} voice(s):`);
for (const change of changes) {
  console.log(`  ${change.provider} — ${change.name} → ${change.gender}`);
}
if (skipped.length > 0) {
  console.log(`\nLeft ${skipped.length} voice(s) unresolved (no single gender token in tags):`);
  for (const voice of skipped) {
    console.log(`  ${voice.provider} — ${voice.name}`);
  }
}
