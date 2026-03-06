#!/usr/bin/env node
/**
 * normalize-language-tags.mjs
 *
 * Applies the same language-tag normalization that catalog.ts runs at
 * runtime, directly to voices.json. Run this as a one-time cleanup and
 * after bulk-importing voices from a new provider.
 *
 * Rule: if a voice's `languages` array contains both a bare BCP-47 base code
 * (e.g. "it") AND one or more sub-locales for the same base (e.g. "it-IT"),
 * the bare code is redundant and is removed.
 *
 * This is the same pure algorithm as `normalizeVoiceLanguages()` in
 * lib/language-utils.ts — kept in sync manually (both are short and obvious).
 *
 * Usage:
 *   node scripts/normalize-language-tags.mjs            # dry-run (no writes)
 *   node scripts/normalize-language-tags.mjs --write    # apply to voices.json
 *
 * Options:
 *   --write     Write normalized data back to voices.json
 *   --verbose   Print every change, not just the summary
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const VOICES_PATH = join(import.meta.dirname, '..', 'apps/web/static/data/voices.json');
const DRY_RUN = !process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

// ─── Same algorithm as normalizeVoiceLanguages() in language-utils.ts ───────

function normalizeLanguages(langs) {
  if (!langs || langs.length <= 1) return langs;

  const basesWithSubLocale = new Set();
  for (const lang of langs) {
    if (lang.includes('-')) {
      basesWithSubLocale.add(lang.split('-')[0]);
    }
  }

  if (basesWithSubLocale.size === 0) return langs;

  const normalized = langs.filter((lang) => {
    if (lang.includes('-')) return true;
    return !basesWithSubLocale.has(lang);
  });

  return normalized.length === langs.length ? langs : normalized;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const raw = JSON.parse(readFileSync(VOICES_PATH, 'utf-8'));
const voices = raw.voices ?? [];

let changedCount = 0;
const updated = voices.map((voice) => {
  const normalized = normalizeLanguages(voice.languages);
  if (normalized === voice.languages) return voice; // same reference — no change

  changedCount++;

  if (VERBOSE) {
    console.log(`  ${voice.name} [${voice.providerId ?? voice.provider}]`);
    console.log(`    before: [${voice.languages.join(', ')}]`);
    console.log(`    after:  [${normalized.join(', ')}]`);
  }

  return { ...voice, languages: normalized };
});

// ─── Report ──────────────────────────────────────────────────────────────────

console.log(`\nVoices scanned:  ${voices.length}`);
console.log(`Voices changed:  ${changedCount}`);
console.log(`Voices unchanged: ${voices.length - changedCount}`);

if (changedCount === 0) {
  console.log('\n✅ No changes needed — voices.json is already normalized.');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('\n⚠️  Dry-run mode — no changes written.');
  console.log('    Run with --write to apply.');
  if (!VERBOSE) {
    console.log('    Run with --verbose to see individual changes.');
  }
} else {
  writeFileSync(VOICES_PATH, JSON.stringify({ voices: updated }, null, 2));
  console.log(`\n✅ Written to ${VOICES_PATH}`);
}
