#!/usr/bin/env node
/**
 * Fix AWS Polly providerVoiceId casing.
 *
 * Polly voice IDs are case-sensitive PascalCase (e.g. "Matthew"). The catalog
 * stored them lowercase ("matthew"), which Polly's SynthesizeSpeech rejects
 * with a ValidationException — breaking synthesis for every Polly voice, and
 * silently disabling the newscaster steering gate (which matches "Matthew"
 * etc.). Polly voice IDs are single PascalCase tokens, so capitalize the first
 * letter. Idempotent.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const VOICES_PATH = join(import.meta.dirname, '..', 'apps/web/static/data/voices.json');
const catalog = JSON.parse(readFileSync(VOICES_PATH, 'utf-8'));

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const changes = [];
for (const voice of catalog.voices) {
  if (voice.providerId !== 'aws-polly' || !voice.providerVoiceId) continue;
  const fixed = capitalize(voice.providerVoiceId);
  if (fixed !== voice.providerVoiceId) {
    changes.push(`${voice.providerVoiceId} → ${fixed}`);
    voice.providerVoiceId = fixed;
  }
}

if (changes.length > 0) {
  writeFileSync(VOICES_PATH, JSON.stringify(catalog, null, 2) + '\n');
}

console.log(`Fixed ${changes.length} Polly voice id(s):`);
for (const c of changes) console.log(`  ${c}`);
