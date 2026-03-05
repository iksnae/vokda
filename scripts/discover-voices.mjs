#!/usr/bin/env node
/**
 * Discover all available voices from each TTS provider API.
 * Outputs raw JSON per provider to scripts/discovery/ for review,
 * then builds a merged catalog and writes to voices.json.
 *
 * Usage: node scripts/discover-voices.mjs
 *
 * Environment variables required:
 *   AWS credentials (via ~/.aws or env)
 *   AZURE_SPEECH_KEY
 *   OPENAI_API_KEY
 *   ELEVENLABS_API_KEY
 *   GOOGLE_CLOUD_API_KEY (optional — may be invalid)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const DISCOVERY_DIR = join(import.meta.dirname, 'discovery');
const VOICES_PATH = join(import.meta.dirname, '..', 'apps/web/static/data/voices.json');
mkdirSync(DISCOVERY_DIR, { recursive: true });

// ─── Helpers ─────────────────────────────────────────────────
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid() {
  let t = Date.now(), ts = '';
  for (let i = 0; i < 10; i++) { ts = CROCKFORD[t % 32] + ts; t = Math.floor(t / 32); }
  const r = new Uint8Array(16);
  globalThis.crypto.getRandomValues(r);
  const rs = Array.from(r).map(b => CROCKFORD[b % 32]).join('');
  return ts + rs;
}

function saveDiscovery(provider, data) {
  const path = join(DISCOVERY_DIR, `${provider}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`  Saved raw discovery to ${path}`);
}

// ─── AWS Polly ───────────────────────────────────────────────
async function discoverPolly() {
  console.log('\n═══ AWS Polly ═══');
  try {
    const raw = execSync('aws polly describe-voices --engine neural --output json', { encoding: 'utf-8' });
    const data = JSON.parse(raw);
    saveDiscovery('aws-polly', data);

    const voices = data.Voices || [];
    console.log(`  Found ${voices.length} neural voices`);

    // Also get standard engine voices
    const rawStd = execSync('aws polly describe-voices --engine standard --output json', { encoding: 'utf-8' });
    const stdData = JSON.parse(rawStd);
    const stdVoices = stdData.Voices || [];
    console.log(`  Found ${stdVoices.length} standard voices`);

    // Neural voices are the ones we want; mark which also have standard
    const stdIds = new Set(stdVoices.map(v => v.Id));

    return voices.map(v => ({
      providerRaw: v,
      name: v.Id,
      provider: 'AWS Polly',
      providerId: 'aws-polly',
      providerVoiceId: v.Id.toLowerCase(),
      description: `${v.LanguageName} ${v.Gender} voice (${v.Id}) — neural engine.`,
      languages: [v.LanguageCode],
      gender: v.Gender,
      engine: 'neural',
      alsoStandard: stdIds.has(v.Id),
      supportedEngines: v.SupportedEngines || ['neural'],
    }));
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    return [];
  }
}

// ─── Azure Speech ────────────────────────────────────────────
async function discoverAzure() {
  console.log('\n═══ Azure Speech ═══');
  const key = process.env.AZURE_SPEECH_KEY;
  if (!key) { console.log('  Skipped — no AZURE_SPEECH_KEY'); return []; }

  const regions = ['eastus', 'westus2', 'westeurope'];
  for (const region of regions) {
    try {
      // First get a token
      const tokenResp = await fetch(
        `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Length': '0' } }
      );
      if (!tokenResp.ok) continue;
      const token = await tokenResp.text();

      const resp = await fetch(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resp.ok) continue;

      const voices = await resp.json();
      saveDiscovery('azure-speech', voices);
      console.log(`  Found ${voices.length} voices via ${region}`);

      // Filter to English neural voices for manageable catalog
      const enNeural = voices.filter(v =>
        v.Locale.startsWith('en-') && v.VoiceType === 'Neural'
      );
      console.log(`  Filtered to ${enNeural.length} English neural voices`);

      return enNeural.map(v => ({
        providerRaw: v,
        name: v.ShortName,
        provider: 'Azure Speech',
        providerId: 'azure-speech',
        providerVoiceId: v.ShortName,
        description: `${v.LocaleName} ${v.Gender} neural voice. ${v.StyleList?.length ? 'Styles: ' + v.StyleList.join(', ') + '.' : ''}`.trim(),
        languages: [v.Locale],
        gender: v.Gender,
        styles: v.StyleList || [],
        roles: v.RolePlayList || [],
        wordPerMinute: v.WordsPerMinute,
      }));
    } catch (err) {
      console.error(`  ${region} failed: ${err.message}`);
    }
  }
  console.error('  All regions failed');
  return [];
}

// ─── OpenAI TTS ──────────────────────────────────────────────
async function discoverOpenAI() {
  console.log('\n═══ OpenAI TTS ═══');
  const key = process.env.OPENAI_API_KEY;
  if (!key) { console.log('  Skipped — no OPENAI_API_KEY'); return []; }

  // OpenAI doesn't have a list voices endpoint. The voices are documented:
  const voices = [
    { id: 'alloy', desc: 'Neutral, balanced, versatile', gender: 'Neutral' },
    { id: 'ash', desc: 'Warm, conversational, approachable', gender: 'Male' },
    { id: 'ballad', desc: 'Soft, gentle, soothing', gender: 'Male' },
    { id: 'coral', desc: 'Clear, friendly, warm', gender: 'Female' },
    { id: 'echo', desc: 'Smooth, deep, resonant', gender: 'Male' },
    { id: 'fable', desc: 'Expressive, animated, storytelling', gender: 'Male' },
    { id: 'nova', desc: 'Energetic, bright, dynamic', gender: 'Female' },
    { id: 'onyx', desc: 'Deep, authoritative, grounded', gender: 'Male' },
    { id: 'sage', desc: 'Calm, wise, measured', gender: 'Female' },
    { id: 'shimmer', desc: 'Light, clear, gentle', gender: 'Female' },
    { id: 'verse', desc: 'Versatile, adaptive, dynamic', gender: 'Male' },
  ];

  saveDiscovery('openai', { voices, note: 'Hardcoded — OpenAI has no list endpoint' });
  console.log(`  ${voices.length} known voices (hardcoded from docs)`);

  return voices.map(v => ({
    providerRaw: v,
    name: v.id,
    provider: 'OpenAI',
    providerId: 'openai',
    providerVoiceId: v.id,
    description: `${v.desc}. OpenAI TTS voice.`,
    languages: ['en-US'], // multilingual but en-US primary
    gender: v.gender,
  }));
}

// ─── ElevenLabs ──────────────────────────────────────────────
async function discoverElevenLabs() {
  console.log('\n═══ ElevenLabs ═══');
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) { console.log('  Skipped — no ELEVENLABS_API_KEY'); return []; }

  try {
    // Get shared/public voices (premade library)
    const resp = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': key },
    });
    if (!resp.ok) {
      console.error(`  HTTP ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    const allVoices = data.voices || [];
    saveDiscovery('elevenlabs', data);
    console.log(`  Found ${allVoices.length} voices in account`);

    // Also fetch the shared voice library for popular voices
    const sharedResp = await fetch(
      'https://api.elevenlabs.io/v1/shared-voices?page_size=100&sort=usage_character_count_7d&language=en',
      { headers: { 'xi-api-key': key } }
    );

    let sharedVoices = [];
    if (sharedResp.ok) {
      const sharedData = await sharedResp.json();
      sharedVoices = sharedData.voices || [];
      saveDiscovery('elevenlabs-shared', sharedData);
      console.log(`  Found ${sharedVoices.length} shared/public voices`);
    }

    // Merge: account voices + top shared voices (deduplicated)
    const seen = new Set(allVoices.map(v => v.voice_id));
    const topShared = sharedVoices
      .filter(v => !seen.has(v.voice_id))
      .slice(0, 30); // top 30 by usage

    const combined = [...allVoices, ...topShared];
    console.log(`  Combined: ${combined.length} unique voices`);

    return combined.map(v => ({
      providerRaw: v,
      name: v.name,
      provider: 'ElevenLabs',
      providerId: 'elevenlabs',
      providerVoiceId: v.voice_id,
      description: (v.description || v.labels?.description || `${v.name} — ElevenLabs voice.`).slice(0, 200),
      languages: ['en-US'], // ElevenLabs is multilingual but primary is EN
      gender: v.labels?.gender || 'unknown',
      category: v.category,
      labels: v.labels || {},
      useCase: v.labels?.use_case,
      accent: v.labels?.accent,
      age: v.labels?.age,
    }));
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    return [];
  }
}

// ─── Google Cloud TTS ────────────────────────────────────────
async function discoverGoogle() {
  console.log('\n═══ Google Cloud TTS ═══');
  const key = process.env.GOOGLE_CLOUD_API_KEY;
  if (!key) { console.log('  Skipped — no GOOGLE_CLOUD_API_KEY'); return []; }

  try {
    const resp = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${key}`);
    if (!resp.ok) {
      const body = await resp.text();
      console.error(`  HTTP ${resp.status}: ${body.slice(0, 150)}`);

      // Fallback: hardcode known Google TTS voices
      console.log('  Using hardcoded Google voice list...');
      return getHardcodedGoogleVoices();
    }

    const data = await resp.json();
    saveDiscovery('gcp-tts', data);
    const voices = data.voices || [];
    console.log(`  Found ${voices.length} voices`);

    // Filter to English voices with Neural2/Studio/Wavenet
    const enPremium = voices.filter(v =>
      v.languageCodes.some(l => l.startsWith('en-')) &&
      v.name.match(/Neural2|Studio|Wavenet|News|Journey/)
    );
    console.log(`  Filtered to ${enPremium.length} English premium voices`);

    return enPremium.map(v => ({
      providerRaw: v,
      name: v.name,
      provider: 'Google Cloud TTS',
      providerId: 'gcp-tts',
      providerVoiceId: v.name,
      description: `Google ${v.name.split('-').slice(2).join(' ')} voice. ${v.ssmlGender} gender.`,
      languages: v.languageCodes,
      gender: v.ssmlGender === 'MALE' ? 'Male' : v.ssmlGender === 'FEMALE' ? 'Female' : 'Neutral',
      naturalSampleRateHertz: v.naturalSampleRateHertz,
    }));
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    return getHardcodedGoogleVoices();
  }
}

function getHardcodedGoogleVoices() {
  // Known popular Google TTS voices
  const voices = [
    { name: 'en-US-Neural2-A', gender: 'Male', lang: 'en-US' },
    { name: 'en-US-Neural2-C', gender: 'Female', lang: 'en-US' },
    { name: 'en-US-Neural2-D', gender: 'Male', lang: 'en-US' },
    { name: 'en-US-Neural2-E', gender: 'Female', lang: 'en-US' },
    { name: 'en-US-Neural2-F', gender: 'Female', lang: 'en-US' },
    { name: 'en-US-Neural2-G', gender: 'Female', lang: 'en-US' },
    { name: 'en-US-Neural2-H', gender: 'Female', lang: 'en-US' },
    { name: 'en-US-Neural2-I', gender: 'Male', lang: 'en-US' },
    { name: 'en-US-Neural2-J', gender: 'Male', lang: 'en-US' },
    { name: 'en-US-Studio-M', gender: 'Male', lang: 'en-US' },
    { name: 'en-US-Studio-O', gender: 'Female', lang: 'en-US' },
    { name: 'en-US-Studio-Q', gender: 'Male', lang: 'en-US' },
    { name: 'en-US-News-K', gender: 'Female', lang: 'en-US' },
    { name: 'en-US-News-L', gender: 'Female', lang: 'en-US' },
    { name: 'en-US-News-N', gender: 'Female', lang: 'en-US' },
    { name: 'en-US-Journey-D', gender: 'Male', lang: 'en-US' },
    { name: 'en-US-Journey-F', gender: 'Female', lang: 'en-US' },
    { name: 'en-US-Journey-O', gender: 'Female', lang: 'en-US' },
    { name: 'en-GB-Neural2-A', gender: 'Female', lang: 'en-GB' },
    { name: 'en-GB-Neural2-B', gender: 'Male', lang: 'en-GB' },
    { name: 'en-GB-Neural2-C', gender: 'Female', lang: 'en-GB' },
    { name: 'en-GB-Neural2-D', gender: 'Male', lang: 'en-GB' },
    { name: 'en-GB-Neural2-F', gender: 'Female', lang: 'en-GB' },
    { name: 'en-AU-Neural2-A', gender: 'Female', lang: 'en-AU' },
    { name: 'en-AU-Neural2-B', gender: 'Male', lang: 'en-AU' },
    { name: 'en-AU-Neural2-C', gender: 'Female', lang: 'en-AU' },
    { name: 'en-AU-Neural2-D', gender: 'Male', lang: 'en-AU' },
  ];

  console.log(`  Using ${voices.length} hardcoded voices`);
  return voices.map(v => ({
    providerRaw: v,
    name: v.name,
    provider: 'Google Cloud TTS',
    providerId: 'gcp-tts',
    providerVoiceId: v.name,
    description: `Google ${v.name} — ${v.gender} ${v.lang} voice.`,
    languages: [v.lang],
    gender: v.gender,
  }));
}

// ─── Build catalog entries ───────────────────────────────────
function buildVoiceEntry(discovered) {
  const id = ulid();
  const sampleId = ulid();
  const variantId = ulid();

  // Determine quality tier
  let qualityTier = 'standard';
  if (discovered.providerId === 'openai' ||
      discovered.providerId === 'elevenlabs' ||
      discovered.name?.includes('Neural') ||
      discovered.name?.includes('Studio') ||
      discovered.name?.includes('Journey') ||
      discovered.engine === 'neural') {
    qualityTier = 'premium';
  }

  // Build source key
  const sourcePrefix = {
    'aws-polly': 'aws:polly',
    'azure-speech': 'azure:speech',
    'gcp-tts': 'gcp:tts',
    'openai': 'openai:tts',
    'elevenlabs': 'elevenlabs:tts',
  }[discovered.providerId] || discovered.providerId;

  const sourceKey = `${sourcePrefix}:${discovered.providerVoiceId}`;

  // Determine source type
  const sourceType = 'cloud_provider';

  // Output formats
  const outputFormats = {
    'aws-polly': ['mp3', 'wav', 'pcm'],
    'azure-speech': ['mp3', 'wav', 'pcm'],
    'gcp-tts': ['mp3', 'wav'],
    'openai': ['mp3', 'wav', 'pcm'],
    'elevenlabs': ['mp3', 'pcm'],
  }[discovered.providerId] || ['mp3'];

  // Max input chars
  const maxInputChars = {
    'aws-polly': 3000,
    'azure-speech': 10000,
    'gcp-tts': 5000,
    'openai': 4000,
    'elevenlabs': 5000,
  }[discovered.providerId] || 3000;

  // SSML support
  const supportsSsml = ['aws-polly', 'azure-speech', 'gcp-tts'].includes(discovered.providerId);

  // Build tags
  const tags = [];
  if (discovered.gender) tags.push(discovered.gender.toLowerCase());
  if (discovered.languages?.[0]) tags.push(discovered.languages[0].split('-')[1]?.toLowerCase() || '');
  if (discovered.useCase) tags.push(discovered.useCase);
  if (discovered.accent) tags.push(discovered.accent);
  if (discovered.category) tags.push(discovered.category);
  const cleanTags = [...new Set(tags.filter(Boolean).map(t => t.toLowerCase()))];

  // Gender presentation
  const genderMap = { Male: 'male', Female: 'female', Neutral: 'neutral' };
  const genderPresentation = genderMap[discovered.gender] || 'unknown';

  // Tone tags
  const toneTags = [];
  if (discovered.styles?.length) {
    toneTags.push(...discovered.styles.slice(0, 3));
  }
  if (toneTags.length === 0) {
    if (genderPresentation === 'female') toneTags.push('clear');
    else if (genderPresentation === 'male') toneTags.push('steady');
    else toneTags.push('neutral');
  }

  // Build a reasonable short label
  const langLabel = discovered.languages?.[0] || 'en-US';
  const genderLabel = genderPresentation !== 'unknown' ? genderPresentation : '';
  const shortLabel = `${langLabel} ${genderLabel} voice`.trim();

  // Sample transcript
  const sampleTranscripts = [
    "This release adds multilingual voice routing and higher reliability across all synthesis adapters.",
    "At dawn, the shipping port becomes a choreography of steel, light, and timing.",
    "I can guide you through setup now, then send a summary to your team workspace.",
    "Before we begin, make sure your workspace has one admin and at least two contributors.",
    "All regional pipelines are now synchronized and latency remains below target thresholds.",
    "Global adoption of AI voice tools accelerated this quarter, led by multilingual deployments.",
    "Introducing a faster way to produce multilingual voice content from a single script.",
    "This guidance applies to all production workloads starting with the next release cycle.",
    "In the valley of Eldoria, the old observatory watched the stars like a patient clockmaker.",
    "I found three voice options that match your preferred tone and language targets.",
  ];
  const transcript = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];

  return {
    id,
    name: discovered.name,
    provider: discovered.provider,
    providerId: discovered.providerId,
    providerVoiceId: discovered.providerVoiceId,
    description: discovered.description,
    tags: cleanTags.slice(0, 5),
    languages: discovered.languages || ['en-US'],
    qualityTier,
    licenseNotes: getLicenseNotes(discovered.providerId),
    metadata: {
      shortLabel: shortLabel,
      searchDescription: discovered.description,
      machineTags: cleanTags,
      useCases: [],
      toneTags: toneTags.slice(0, 3),
      audienceTags: [],
      accent: discovered.accent || undefined,
      genderPresentation,
      agePresentation: discovered.age || 'adult',
      speakingStyle: discovered.styles?.[0] || undefined,
      metadataQuality: 'sparse',
    },
    samples: [
      {
        id: sampleId,
        scriptKey: 'default',
        label: 'Default',
        transcript,
      }
    ],
    variants: [
      {
        id: variantId,
        sourceType,
        sourceKey,
        runnable: true,
        supportsSsml,
        outputFormats,
        maxInputChars,
        previewOnly: false,
      }
    ],
  };
}

function getLicenseNotes(providerId) {
  const map = {
    'aws-polly': 'Use governed by AWS service terms and account-level usage rights.',
    'azure-speech': 'Use governed by Azure AI Speech terms and your subscription agreement.',
    'gcp-tts': 'Use governed by Google Cloud Text-to-Speech terms and billing policies.',
    'openai': 'Use governed by OpenAI API terms and account-level policy controls.',
    'elevenlabs': 'Use governed by ElevenLabs API terms and plan entitlements.',
  };
  return map[providerId] || 'Check provider terms before production use.';
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  console.log('Voice Discovery — querying all provider APIs...');

  const [polly, azure, openai, elevenlabs, google] = await Promise.all([
    discoverPolly(),
    discoverAzure(),
    discoverOpenAI(),
    discoverElevenLabs(),
    discoverGoogle(),
  ]);

  const allDiscovered = [...polly, ...azure, ...openai, ...elevenlabs, ...google];
  console.log(`\n═══ Total discovered: ${allDiscovered.length} voices ═══`);
  console.log(`  AWS Polly:     ${polly.length}`);
  console.log(`  Azure Speech:  ${azure.length}`);
  console.log(`  OpenAI:        ${openai.length}`);
  console.log(`  ElevenLabs:    ${elevenlabs.length}`);
  console.log(`  Google TTS:    ${google.length}`);

  // Load existing catalog to preserve hand-curated entries
  const existing = JSON.parse(readFileSync(VOICES_PATH, 'utf-8'));
  const existingByKey = new Map();
  for (const v of existing.voices) {
    const key = `${v.providerId}:${v.providerVoiceId}`;
    existingByKey.set(key, v);
  }

  // Build new entries, preserving existing curated ones
  const newVoices = [];
  let preserved = 0, added = 0;

  for (const disc of allDiscovered) {
    const key = `${disc.providerId}:${disc.providerVoiceId}`;
    if (existingByKey.has(key)) {
      newVoices.push(existingByKey.get(key));
      existingByKey.delete(key);
      preserved++;
    } else {
      newVoices.push(buildVoiceEntry(disc));
      added++;
    }
  }

  // Keep any existing entries not matched (e.g. HuggingFace custom)
  for (const remaining of existingByKey.values()) {
    newVoices.push(remaining);
    preserved++;
  }

  // Sort: existing curated first, then by provider + name
  newVoices.sort((a, b) => {
    const qa = a.metadata?.metadataQuality === 'editorial' ? 0 : a.metadata?.metadataQuality === 'curated' ? 1 : 2;
    const qb = b.metadata?.metadataQuality === 'editorial' ? 0 : b.metadata?.metadataQuality === 'curated' ? 1 : 2;
    if (qa !== qb) return qa - qb;
    if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
    return a.name.localeCompare(b.name);
  });

  const catalog = { voices: newVoices };
  writeFileSync(VOICES_PATH, JSON.stringify(catalog, null, 2) + '\n');

  console.log(`\n═══ Catalog updated ═══`);
  console.log(`  Preserved: ${preserved} (existing curated entries)`);
  console.log(`  Added:     ${added} (new from API discovery)`);
  console.log(`  Total:     ${newVoices.length} voices in catalog`);

  // Summary by provider
  const byProvider = {};
  for (const v of newVoices) {
    byProvider[v.provider] = (byProvider[v.provider] || 0) + 1;
  }
  console.log('\n  By provider:');
  for (const [p, c] of Object.entries(byProvider).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${p}: ${c}`);
  }
}

main().catch(console.error);
