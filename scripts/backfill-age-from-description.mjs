#!/usr/bin/env node
/**
 * Backfill metadata.agePresentation from provider-authored descriptions.
 *
 * 207/550 voices ship with an empty agePresentation — concentrated in
 * Cartesia, LMNT and Orpheus, whose APIs don't expose an age field. Their
 * *descriptions*, however, frequently state the age explicitly ("young adult
 * male", "Middle-aged American female", "elderly male"). This recovers that
 * signal with conservative, most-specific-first matching.
 *
 * Deliberately NOT a blanket default to "adult": per issue #5, an empty
 * agePresentation must keep meaning "unknown" rather than "defaulted", so
 * voices with no explicit age cue are left untouched.
 *
 * Idempotent. See issue #5.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const VOICES_PATH = join(import.meta.dirname, '..', 'apps/web/static/data/voices.json');

// Ordered most-specific-first; first match wins. Values match the existing
// agePresentation vocabulary already present in the catalog.
const AGE_PATTERNS = [
  [/\byoung adult\b/i, 'young adult'],
  [/\bmiddle[- ]aged\b/i, 'middle_aged'],
  [/\b(child|children|kid|infant|toddler)\b/i, 'child'],
  [/\b(elderly|senior|aged|older|old man|old woman)\b/i, 'old'],
  [/\bmature\b/i, 'mature'],
  [/\b(young|youthful|youth)\b/i, 'young'],
];

function ageFromDescription(description) {
  const text = description ?? '';
  for (const [pattern, value] of AGE_PATTERNS) {
    if (pattern.test(text)) return value;
  }
  return null;
}

const catalog = JSON.parse(readFileSync(VOICES_PATH, 'utf-8'));

const changes = [];
let stillEmpty = 0;

for (const voice of catalog.voices) {
  const metadata = voice.metadata;
  if (!metadata) continue;
  const current = metadata.agePresentation;
  if (current !== '' && current !== null && current !== undefined) continue;

  const derived = ageFromDescription(voice.description);
  if (derived) {
    metadata.agePresentation = derived;
    changes.push({ name: voice.name, provider: voice.provider, age: derived });
  } else {
    stillEmpty += 1;
  }
}

if (changes.length > 0) {
  writeFileSync(VOICES_PATH, JSON.stringify(catalog, null, 2) + '\n');
}

console.log(`Backfilled agePresentation for ${changes.length} voice(s) from descriptions:`);
const byValue = {};
for (const change of changes) byValue[change.age] = (byValue[change.age] || 0) + 1;
console.log('  by value:', JSON.stringify(byValue));
console.log(`Left ${stillEmpty} voice(s) empty (no explicit age cue — kept as "unknown").`);
