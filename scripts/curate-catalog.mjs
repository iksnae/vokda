#!/usr/bin/env node
/**
 * Curate the discovered voices into a high-quality catalog.
 * Selects the best voices per provider based on:
 *   - Variety of locales/accents
 *   - Expressiveness (style support)
 *   - Gender balance
 *   - Use case coverage
 *
 * Reads the full catalog and filters to a curated set.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const VOICES_PATH = join(import.meta.dirname, '..', 'apps/web/static/data/voices.json');
const catalog = JSON.parse(readFileSync(VOICES_PATH, 'utf-8'));

// ─── Selection criteria per provider ─────────────────────────

// AWS Polly: pick top English voices, diverse accents
const pollyPicks = new Set([
  'joanna',     // US female — warm, popular
  'matthew',    // US male — documentary
  'ruth',       // US female — conversational
  'stephen',    // US male — conversational
  'amy',        // UK female — crisp
  'brian',      // UK male — narrator
  'olivia',     // AU female
  'daniel',     // DE-accented English
  'aria',       // NZ female
  'gregory',    // US male — announcer
  'danielle',   // US female — soft
  'liam',       // CA male
  'kajal',      // IN female — Hindi-accented English
  'salli',      // US female — friendly
  'ivy',        // US female — young
  'kendra',     // US female — clear
  'kimberly',   // US female — crisp
  'joey',       // US male — casual
]);

// Azure: pick expressive voices + diverse locales
const azurePicks = new Set([
  'en-US-JennyNeural',    // most versatile, many styles
  'en-US-AriaNeural',     // professional narrator, many styles
  'en-US-GuyNeural',      // male, many styles
  'en-US-DavisNeural',    // male, conversational
  'en-US-JaneNeural',     // female, expressive
  'en-US-SaraNeural',     // female, expressive
  'en-US-TonyNeural',     // male, expressive
  'en-US-NancyNeural',    // female, expressive
  'en-US-AvaNeural',      // female, emotional
  'en-US-KaiNeural',      // conversation
  'en-US-LunaNeural',     // conversation
  'en-US-AndrewMultilingualNeural',  // multilingual
  'en-US-PhoebeMultilingualNeural',  // multilingual
  'en-GB-SoniaNeural',    // UK female
  'en-GB-RyanNeural',     // UK male, styles
  'en-GB-LibbyNeural',    // UK female
  'en-AU-NatashaNeural',  // AU female
  'en-AU-WilliamNeural',  // AU male
  'en-IN-NeerjaNeural',   // Indian female, styles
  'en-IN-PrabhatNeural',  // Indian male
  'en-IE-EmilyNeural',    // Irish female
  'en-IE-ConnorNeural',   // Irish male
]);

// OpenAI: keep all (only 11)
// ElevenLabs: pick premade + notable community voices
// Google: keep all hardcoded (already curated)

function shouldKeep(voice) {
  // Always keep hand-curated editorial/curated entries
  if (voice.metadata?.metadataQuality === 'editorial' || voice.metadata?.metadataQuality === 'curated') {
    return true;
  }

  // HuggingFace — keep all
  if (voice.providerId === 'huggingface') return true;

  // OpenAI — keep all
  if (voice.providerId === 'openai') return true;

  // Google — keep all (already a curated hardcoded list)
  if (voice.providerId === 'gcp-tts') return true;

  // AWS Polly
  if (voice.providerId === 'aws-polly') {
    return pollyPicks.has(voice.providerVoiceId?.toLowerCase());
  }

  // Azure
  if (voice.providerId === 'azure-speech') {
    return azurePicks.has(voice.providerVoiceId);
  }

  // ElevenLabs — keep premade/professional voices, limit to ~15
  if (voice.providerId === 'elevenlabs') {
    // Keep existing curated one
    if (voice.metadata?.metadataQuality !== 'sparse') return true;
    // Keep premade voices
    const raw = voice._discoveryCategory;
    if (raw === 'premade') return true;
    return false;
  }

  return false;
}

// Mark ElevenLabs premade status before filtering
for (const v of catalog.voices) {
  if (v.providerId === 'elevenlabs') {
    // Check discovery data for category
    try {
      const disc = JSON.parse(readFileSync(join(import.meta.dirname, 'discovery/elevenlabs.json'), 'utf-8'));
      const match = disc.voices?.find(dv => dv.voice_id === v.providerVoiceId);
      if (match) {
        v._discoveryCategory = match.category;
        v._discoveryLabels = match.labels;
      }
    } catch { /* ignore */ }
  }
}

const curated = catalog.voices.filter(shouldKeep);

// Clean up temporary fields
for (const v of curated) {
  delete v._discoveryCategory;
  delete v._discoveryLabels;
}

// Sort
curated.sort((a, b) => {
  const qa = a.metadata?.metadataQuality === 'editorial' ? 0 : a.metadata?.metadataQuality === 'curated' ? 1 : 2;
  const qb = b.metadata?.metadataQuality === 'editorial' ? 0 : b.metadata?.metadataQuality === 'curated' ? 1 : 2;
  if (qa !== qb) return qa - qb;
  if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
  return a.name.localeCompare(b.name);
});

writeFileSync(VOICES_PATH, JSON.stringify({ voices: curated }, null, 2) + '\n');

console.log(`\n═══ Curated catalog ═══`);
console.log(`  Before: ${catalog.voices.length} voices`);
console.log(`  After:  ${curated.length} voices`);

const byProvider = {};
for (const v of curated) {
  byProvider[v.provider] = (byProvider[v.provider] || 0) + 1;
}
console.log('\n  By provider:');
for (const [p, c] of Object.entries(byProvider).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${p}: ${c}`);
}

// List all voices
console.log('\n  Voice list:');
for (const v of curated) {
  const q = v.metadata?.metadataQuality === 'editorial' ? '★' : v.metadata?.metadataQuality === 'curated' ? '◆' : '○';
  const audio = v.samples[0]?.audioUrl ? '♪' : ' ';
  console.log(`    ${q}${audio} ${v.provider.padEnd(18)} ${v.name}`);
}
