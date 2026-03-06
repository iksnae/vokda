#!/usr/bin/env node
/**
 * curate-cartesia.mjs — Add Cartesia Sonic voices to catalog.
 * Curates top English voices (355 available, we take the public library).
 * Generates audio samples via Cartesia TTS API.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import https from 'https';

const VOICES_PATH = 'apps/web/static/data/voices.json';
const AUDIO_DIR = 'apps/web/static/audio/samples';
const CARTESIA_PATH = '/tmp/cartesia-voices.json';
const API_KEY = process.env.CARTESIA_API_KEY || 'sk_car_JWqVrxch3QTiPYw8aAUCMN';

mkdirSync(AUDIO_DIR, { recursive: true });

function stableId(seed) {
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let id = '';
  for (let i = 0; i < 26; i++) {
    id += chars[parseInt(hash.substr(i % 32, 2), 16) % 32];
  }
  return id;
}

function downloadAudio(voiceId, text, outPath) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model_id: 'sonic',
      transcript: text,
      voice: { mode: 'id', id: voiceId },
      output_format: { container: 'mp3', bit_rate: 128000, sample_rate: 44100 },
    });
    const opts = {
      hostname: 'api.cartesia.ai',
      port: 443,
      path: '/tts/bytes',
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Cartesia-Version': '2024-06-10',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      if (res.statusCode !== 200) {
        let errBody = '';
        res.on('data', d => errBody += d);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${errBody.slice(0, 200)}`)));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        writeFileSync(outPath, buf);
        resolve(buf.length);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const allCartesia = JSON.parse(readFileSync(CARTESIA_PATH, 'utf8'));
  // Filter: English, public, not archived
  const enVoices = allCartesia.filter(v =>
    v.language === 'en' && v.is_public && !v.is_archived
  );
  console.log(`Cartesia: ${allCartesia.length} total, ${enVoices.length} English public voices`);

  const raw = JSON.parse(readFileSync(VOICES_PATH, 'utf8'));
  const voices = raw.voices;
  const existingKeys = new Set(voices.map(v => `${v.providerId}:${v.providerVoiceId || v.name}`));

  let added = 0, sampled = 0, errors = 0;

  for (let i = 0; i < enVoices.length; i++) {
    const cv = enVoices[i];
    const key = `cartesia:${cv.id}`;
    if (existingKeys.has(key)) continue;

    const id = stableId(key);
    const gender = cv.gender === 'feminine' ? 'female' : cv.gender === 'masculine' ? 'male' : 'neutral';
    const name = cv.name || 'Unnamed';
    const desc = cv.description || `${gender} Cartesia Sonic voice.`;

    const voice = {
      id,
      name,
      provider: 'Cartesia',
      providerId: 'cartesia',
      providerVoiceId: cv.id,
      description: desc,
      tags: ['sonic', 'neural', gender, 'streaming', 'low-latency'],
      languages: ['en-US'],
      qualityTier: 'premium',
      licenseNotes: 'Cartesia API terms. Pay-per-character.',
      audioUrl: `/audio/samples/${id}.mp3`,
      imageUrl: `/images/voices/${id}.jpg`,
      metadata: {
        shortLabel: `${name} — Cartesia`,
        searchDescription: `Cartesia ${name}: ${desc}`,
        machineTags: ['cartesia', 'sonic', gender],
        useCases: ['conversational', 'customer-service', 'narration'],
        toneTags: [],
        audienceTags: ['developers', 'enterprises'],
        genderPresentation: gender,
        metadataQuality: 'curated',
      },
      modelCard: {
        modelName: 'Cartesia Sonic',
        architecture: 'sonic',
        providerType: 'cloud_provider',
        providerUrl: 'https://cartesia.ai',
        license: 'Proprietary (Cartesia API)',
        commercialUse: true,
        sampleRate: 44100,
        outputFormat: 'mp3',
        streamingCapable: true,
        cartesiaVoiceId: cv.id,
        totalVoices: enVoices.length,
      },
      samples: [{
        id: `s-${id}`,
        label: 'Default',
        text: 'The morning sun cast long shadows across the quiet street, and somewhere in the distance a church bell rang, marking the start of a brand new day.',
        audioUrl: `/audio/samples/${id}.mp3`,
      }],
      variants: [{
        sourceKey: cv.id,
        label: name,
        engine: 'sonic',
        supportsStreaming: true,
        supportsSsml: false,
        maxChars: 5000,
      }],
    };

    voices.push(voice);
    existingKeys.add(key);
    added++;

    // Generate audio
    const audioPath = `${AUDIO_DIR}/${id}.mp3`;
    if (!existsSync(audioPath)) {
      try {
        const sampleText = voice.samples[0].text;
        const size = await downloadAudio(cv.id, sampleText, audioPath);
        console.log(`  [${i+1}/${enVoices.length}] ✓ ${name.padEnd(35).slice(0,35)} ${size} bytes`);
        sampled++;
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        console.log(`  [${i+1}/${enVoices.length}] ✗ ${name.padEnd(35).slice(0,35)} ${e.message.slice(0,80)}`);
        errors++;
        // Remove from catalog if sample failed
        voices.pop();
        existingKeys.delete(key);
        added--;
      }
    }
  }

  writeFileSync(VOICES_PATH, JSON.stringify({ voices }, null, 2));
  console.log(`\n✅ Cartesia: ${added} added, ${sampled} sampled, ${errors} errors`);
  console.log(`📊 Total catalog: ${voices.length} voices`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
