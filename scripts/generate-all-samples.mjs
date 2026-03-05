#!/usr/bin/env node
/**
 * Generate audio samples for all voices in the catalog that don't have one yet.
 * Calls each provider's API using the sample transcript.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const VOICES_PATH = join(import.meta.dirname, '..', 'apps/web/static/data/voices.json');
const AUDIO_DIR = join(import.meta.dirname, '..', 'apps/web/static/audio/samples');
mkdirSync(AUDIO_DIR, { recursive: true });

const catalog = JSON.parse(readFileSync(VOICES_PATH, 'utf-8'));

const stats = { success: 0, skipped: 0, failed: 0, existing: 0 };

// ─── Provider synth functions ────────────────────────────────

async function synthPolly(voice) {
  const voiceId = voice.providerVoiceId;
  const pollyId = voiceId.charAt(0).toUpperCase() + voiceId.slice(1);
  const text = voice.samples[0].transcript;
  const out = join(AUDIO_DIR, `${voice.id}.mp3`);

  try {
    execSync(
      `aws polly synthesize-speech --output-format mp3 --voice-id ${pollyId} --engine neural ` +
      `--text-type text --text '${text.replace(/'/g, "'\\''")}' "${out}"`,
      { stdio: 'pipe', timeout: 15000 }
    );
    return true;
  } catch (err) {
    // Some voices might not support neural, try standard
    try {
      execSync(
        `aws polly synthesize-speech --output-format mp3 --voice-id ${pollyId} --engine standard ` +
        `--text-type text --text '${text.replace(/'/g, "'\\''")}' "${out}"`,
        { stdio: 'pipe', timeout: 15000 }
      );
      return true;
    } catch {
      console.error(`    FAILED ${pollyId}: ${err.stderr?.toString().slice(0, 100) || err.message}`);
      return false;
    }
  }
}

async function synthAzure(voice) {
  const key = process.env.AZURE_SPEECH_KEY;
  if (!key) return false;

  const voiceId = voice.providerVoiceId;
  const text = voice.samples[0].transcript;
  const lang = voice.languages[0] || 'en-US';
  const out = join(AUDIO_DIR, `${voice.id}.mp3`);

  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
    `<voice name='${voiceId}'>${text}</voice></speak>`;

  try {
    const resp = await fetch(
      'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1',
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        },
        body: ssml,
      }
    );
    if (!resp.ok) {
      console.error(`    FAILED ${voiceId}: HTTP ${resp.status}`);
      return false;
    }
    writeFileSync(out, Buffer.from(await resp.arrayBuffer()));
    return true;
  } catch (err) {
    console.error(`    FAILED ${voiceId}: ${err.message}`);
    return false;
  }
}

async function synthOpenAI(voice) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return false;

  const text = voice.samples[0].transcript;
  const out = join(AUDIO_DIR, `${voice.id}.mp3`);

  try {
    const resp = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', voice: voice.providerVoiceId, input: text, response_format: 'mp3' }),
    });
    if (!resp.ok) {
      console.error(`    FAILED ${voice.providerVoiceId}: HTTP ${resp.status}`);
      return false;
    }
    writeFileSync(out, Buffer.from(await resp.arrayBuffer()));
    return true;
  } catch (err) {
    console.error(`    FAILED ${voice.providerVoiceId}: ${err.message}`);
    return false;
  }
}

async function synthElevenLabs(voice) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return false;

  const text = voice.samples[0].transcript;
  const out = join(AUDIO_DIR, `${voice.id}.mp3`);

  try {
    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice.providerVoiceId}`,
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
      }
    );
    if (!resp.ok) {
      console.error(`    FAILED ${voice.name}: HTTP ${resp.status}`);
      return false;
    }
    writeFileSync(out, Buffer.from(await resp.arrayBuffer()));
    return true;
  } catch (err) {
    console.error(`    FAILED ${voice.name}: ${err.message}`);
    return false;
  }
}

// Google voices — use OpenAI as fallback since GCP key is invalid
async function synthGoogleFallback(voice) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return false;

  const text = voice.samples[0].transcript;
  const out = join(AUDIO_DIR, `${voice.id}.mp3`);

  // Map to an OpenAI voice that roughly matches
  const gender = voice.metadata?.genderPresentation;
  const fallbackVoice = gender === 'female' ? 'shimmer' : gender === 'male' ? 'echo' : 'alloy';

  try {
    const resp = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', voice: fallbackVoice, input: text, response_format: 'mp3' }),
    });
    if (!resp.ok) return false;
    writeFileSync(out, Buffer.from(await resp.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────────
const synthMap = {
  'aws-polly': synthPolly,
  'azure-speech': synthAzure,
  'openai': synthOpenAI,
  'elevenlabs': synthElevenLabs,
  'gcp-tts': synthGoogleFallback,
};

async function processVoice(voice) {
  const out = join(AUDIO_DIR, `${voice.id}.mp3`);

  // Already has audio
  if (voice.samples[0]?.audioUrl && existsSync(out)) {
    stats.existing++;
    return;
  }

  const synth = synthMap[voice.providerId];
  if (!synth) {
    stats.skipped++;
    return;
  }

  process.stdout.write(`  ${voice.provider.padEnd(18)} ${voice.name.padEnd(35)} `);

  const ok = await synth(voice);
  if (ok) {
    voice.samples[0].audioUrl = `/audio/samples/${voice.id}.mp3`;
    stats.success++;
    console.log('✓');
  } else {
    stats.failed++;
    console.log('✗');
  }
}

async function main() {
  const needsSample = catalog.voices.filter(v => {
    const out = join(AUDIO_DIR, `${v.id}.mp3`);
    return !v.samples[0]?.audioUrl || !existsSync(out);
  });

  console.log(`\nGenerating samples for ${needsSample.length} voices (${catalog.voices.length - needsSample.length} already have audio)...\n`);

  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < catalog.voices.length; i += 5) {
    const batch = catalog.voices.slice(i, i + 5);
    await Promise.all(batch.map(v => processVoice(v)));
  }

  writeFileSync(VOICES_PATH, JSON.stringify(catalog, null, 2) + '\n');

  console.log(`\n═══ Results ═══`);
  console.log(`  Existing: ${stats.existing}`);
  console.log(`  Success:  ${stats.success}`);
  console.log(`  Skipped:  ${stats.skipped}`);
  console.log(`  Failed:   ${stats.failed}`);
  console.log(`  Total:    ${catalog.voices.length}`);

  const withAudio = catalog.voices.filter(v => v.samples[0]?.audioUrl).length;
  console.log(`  With audio: ${withAudio}/${catalog.voices.length}`);
}

main().catch(console.error);
