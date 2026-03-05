#!/usr/bin/env node
/**
 * Generate real audio samples for all seed voices.
 * Calls each provider API to synthesize the sample transcript.
 * Outputs MP3 to apps/web/static/audio/samples/<voiceId>.mp3
 * Then patches voices.json with audioUrl fields.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const VOICES_PATH = join(import.meta.dirname, '..', 'apps/web/static/data/voices.json');
const AUDIO_DIR = join(import.meta.dirname, '..', 'apps/web/static/audio/samples');
const catalog = JSON.parse(readFileSync(VOICES_PATH, 'utf-8'));

mkdirSync(AUDIO_DIR, { recursive: true });

const results = { success: [], skipped: [], failed: [] };

// ─── AWS Polly ───────────────────────────────────────────────
async function synthesizePolly(voice) {
  const sample = voice.samples[0];
  const voiceId = voice.providerVoiceId;
  // Capitalize first letter for Polly voice ID
  const pollyVoiceId = voiceId.charAt(0).toUpperCase() + voiceId.slice(1);
  const outPath = join(AUDIO_DIR, `${voice.id}.mp3`);

  console.log(`  [AWS Polly] ${pollyVoiceId}: "${sample.transcript.slice(0, 50)}..."`);

  try {
    // Use AWS CLI since we have credentials configured
    execSync(
      `aws polly synthesize-speech ` +
      `--output-format mp3 ` +
      `--voice-id ${pollyVoiceId} ` +
      `--engine neural ` +
      `--text-type text ` +
      `--text '${sample.transcript.replace(/'/g, "'\\''")}' ` +
      `"${outPath}"`,
      { stdio: 'pipe' }
    );
    return outPath;
  } catch (err) {
    console.error(`  [AWS Polly] FAILED: ${err.message}`);
    return null;
  }
}

// ─── Azure Speech ────────────────────────────────────────────
async function synthesizeAzure(voice) {
  const sample = voice.samples[0];
  const azureVoiceId = voice.providerVoiceId;
  const outPath = join(AUDIO_DIR, `${voice.id}.mp3`);
  const key = process.env.AZURE_SPEECH_KEY;

  if (!key) {
    console.log(`  [Azure] Skipped — no AZURE_SPEECH_KEY`);
    return null;
  }

  // Try common regions
  const regions = ['eastus', 'westus2', 'westeurope', 'southeastasia'];
  const lang = voice.languages[0] || 'en-US';

  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
    `<voice name='${azureVoiceId}'>${sample.transcript}</voice></speak>`;

  console.log(`  [Azure] ${azureVoiceId}: "${sample.transcript.slice(0, 50)}..."`);

  for (const region of regions) {
    try {
      const resp = await fetch(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
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
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        writeFileSync(outPath, buf);
        return outPath;
      }
      // If 401/403, try next region
      if (resp.status === 401 || resp.status === 403) continue;
      console.error(`  [Azure] ${region} HTTP ${resp.status}: ${await resp.text()}`);
    } catch (err) {
      console.error(`  [Azure] ${region} error: ${err.message}`);
    }
  }
  console.error(`  [Azure] All regions failed for ${azureVoiceId}`);
  return null;
}

// ─── Google Cloud TTS ────────────────────────────────────────
async function synthesizeGoogle(voice) {
  const sample = voice.samples[0];
  const outPath = join(AUDIO_DIR, `${voice.id}.mp3`);
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

  if (!apiKey) {
    console.log(`  [Google] Skipped — no GOOGLE_CLOUD_API_KEY`);
    return null;
  }

  const gcpVoiceId = voice.providerVoiceId;
  const lang = voice.languages[0] || 'en-US';

  console.log(`  [Google] ${gcpVoiceId}: "${sample.transcript.slice(0, 50)}..."`);

  try {
    const resp = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: sample.transcript },
          voice: { languageCode: lang, name: gcpVoiceId },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      }
    );

    if (!resp.ok) {
      const body = await resp.text();
      console.error(`  [Google] HTTP ${resp.status}: ${body.slice(0, 200)}`);
      return null;
    }

    const data = await resp.json();
    const buf = Buffer.from(data.audioContent, 'base64');
    writeFileSync(outPath, buf);
    return outPath;
  } catch (err) {
    console.error(`  [Google] FAILED: ${err.message}`);
    return null;
  }
}

// ─── ElevenLabs ──────────────────────────────────────────────
async function synthesizeElevenLabs(voice) {
  const sample = voice.samples[0];
  const outPath = join(AUDIO_DIR, `${voice.id}.mp3`);
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.log(`  [ElevenLabs] Skipped — no ELEVENLABS_API_KEY`);
    return null;
  }

  console.log(`  [ElevenLabs] ${voice.name}: "${sample.transcript.slice(0, 50)}..."`);

  // First get voices list to find the voice ID
  try {
    const listResp = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });

    if (!listResp.ok) {
      console.error(`  [ElevenLabs] List voices HTTP ${listResp.status}`);
      return null;
    }

    const voicesData = await listResp.json();
    // Find voice by name (case-insensitive)
    const elVoice = voicesData.voices?.find(
      (v) => v.name.toLowerCase() === voice.name.toLowerCase()
    );

    if (!elVoice) {
      // Try with common premade voices
      console.log(`  [ElevenLabs] Voice "${voice.name}" not found in account. Trying premade...`);
      // Use the first available voice as fallback for demo purposes
      const premade = voicesData.voices?.find(v =>
        v.category === 'premade' || v.labels?.use_case === 'narration'
      );
      if (!premade) {
        console.error(`  [ElevenLabs] No suitable voice found`);
        return null;
      }
      console.log(`  [ElevenLabs] Using fallback voice: ${premade.name} (${premade.voice_id})`);
      return await doElevenLabsSynth(premade.voice_id, sample.transcript, outPath, apiKey);
    }

    return await doElevenLabsSynth(elVoice.voice_id, sample.transcript, outPath, apiKey);
  } catch (err) {
    console.error(`  [ElevenLabs] FAILED: ${err.message}`);
    return null;
  }
}

async function doElevenLabsSynth(voiceId, text, outPath, apiKey) {
  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!resp.ok) {
    const body = await resp.text();
    console.error(`  [ElevenLabs] Synth HTTP ${resp.status}: ${body.slice(0, 200)}`);
    return null;
  }

  const buf = Buffer.from(await resp.arrayBuffer());
  writeFileSync(outPath, buf);
  return outPath;
}

// ─── OpenAI TTS ──────────────────────────────────────────────
async function synthesizeOpenAI(voice) {
  const sample = voice.samples[0];
  const outPath = join(AUDIO_DIR, `${voice.id}.mp3`);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log(`  [OpenAI] Skipped — no OPENAI_API_KEY`);
    return null;
  }

  const openaiVoice = voice.providerVoiceId; // alloy, nova, onyx

  console.log(`  [OpenAI] ${openaiVoice}: "${sample.transcript.slice(0, 50)}..."`);

  try {
    const resp = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: openaiVoice,
        input: sample.transcript,
        response_format: 'mp3',
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error(`  [OpenAI] HTTP ${resp.status}: ${body.slice(0, 200)}`);
      return null;
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    writeFileSync(outPath, buf);
    return outPath;
  } catch (err) {
    console.error(`  [OpenAI] FAILED: ${err.message}`);
    return null;
  }
}

// ─── Main ────────────────────────────────────────────────────
const providerSynth = {
  'aws-polly': synthesizePolly,
  'azure-speech': synthesizeAzure,
  'gcp-tts': synthesizeGoogle,
  elevenlabs: synthesizeElevenLabs,
  openai: synthesizeOpenAI,
};

async function main() {
  console.log(`\nGenerating samples for ${catalog.voices.length} voices...\n`);

  for (const voice of catalog.voices) {
    const providerId = voice.providerId ?? '';
    const synth = providerSynth[providerId];

    if (!synth) {
      console.log(`⏭  ${voice.name} (${voice.provider}) — no synth adapter, skipping`);
      results.skipped.push(voice.name);
      continue;
    }

    // Skip if already generated
    const outPath = join(AUDIO_DIR, `${voice.id}.mp3`);
    if (existsSync(outPath)) {
      console.log(`✓  ${voice.name} — already exists`);
      results.success.push(voice.name);
      // Still update the audioUrl
      voice.samples[0].audioUrl = `/audio/samples/${voice.id}.mp3`;
      continue;
    }

    const result = await synth(voice);
    if (result) {
      console.log(`✓  ${voice.name} — saved`);
      results.success.push(voice.name);
      voice.samples[0].audioUrl = `/audio/samples/${voice.id}.mp3`;
    } else {
      console.log(`✗  ${voice.name} — failed`);
      results.failed.push(voice.name);
    }
  }

  // Write updated voices.json
  writeFileSync(VOICES_PATH, JSON.stringify(catalog, null, 2) + '\n');

  console.log(`\n─── Results ───`);
  console.log(`  ✓ Success: ${results.success.length} (${results.success.join(', ')})`);
  console.log(`  ⏭ Skipped: ${results.skipped.length} (${results.skipped.join(', ')})`);
  console.log(`  ✗ Failed:  ${results.failed.length} (${results.failed.join(', ')})`);
  console.log(`\nUpdated ${VOICES_PATH}`);
}

main().catch(console.error);
