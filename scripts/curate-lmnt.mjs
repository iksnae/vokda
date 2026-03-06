#!/usr/bin/env node
/**
 * curate-lmnt.mjs — Add all LMNT TTS voices to catalog with audio samples.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import https from 'https';

const VOICES_PATH = 'apps/web/static/data/voices.json';
const AUDIO_DIR = 'apps/web/static/audio/samples';
const LMNT_PATH = '/tmp/lmnt-voices.json';
const API_KEY = process.env.LMNT_API_KEY || 'ak_LqW9Vyuvnsu6EW8CR5dxC7';

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
    const body = JSON.stringify({ voice: voiceId, text, format: 'mp3' });
    const opts = {
      hostname: 'api.lmnt.com',
      port: 443,
      path: '/v1/ai/speech',
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
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
  const lmntVoices = JSON.parse(readFileSync(LMNT_PATH, 'utf8'));
  const systemVoices = lmntVoices.filter(v => v.owner === 'system' && v.state === 'ready');
  console.log(`LMNT: ${systemVoices.length} system voices`);

  const raw = JSON.parse(readFileSync(VOICES_PATH, 'utf8'));
  const voices = raw.voices;
  const existingKeys = new Set(voices.map(v => `${v.providerId}:${v.providerVoiceId || v.name}`));

  let added = 0, sampled = 0;

  for (let i = 0; i < systemVoices.length; i++) {
    const lv = systemVoices[i];
    const key = `lmnt:${lv.id}`;
    if (existingKeys.has(key)) {
      console.log(`  [${i+1}/${systemVoices.length}] skip: ${lv.name} (exists)`);
      continue;
    }

    const id = stableId(key);
    const gender = lv.gender === 'F' ? 'female' : lv.gender === 'M' ? 'male' : 'neutral';
    const desc = lv.description || `${lv.name}: ${gender} LMNT voice.`;
    const voiceType = lv.type || 'instant'; // 'instant' or 'professional'
    const tags = [
      gender, voiceType, 'streaming', 'low-latency',
      ...(lv.tags || []).map(t => t.replace('primary:', '').replace(/ /g, '-')),
    ];

    const voice = {
      id,
      name: lv.name,
      provider: 'LMNT',
      providerId: 'lmnt',
      providerVoiceId: lv.id,
      description: desc,
      tags,
      languages: ['en-US'],
      qualityTier: voiceType === 'professional' ? 'premium' : 'standard',
      licenseNotes: 'LMNT API terms. Free tier available.',
      audioUrl: `/audio/samples/${id}.mp3`,
      imageUrl: `/images/voices/${id}.jpg`,
      metadata: {
        shortLabel: `${lv.name} — LMNT`,
        searchDescription: `LMNT ${lv.name}: ${desc}`,
        machineTags: ['lmnt', gender, voiceType],
        useCases: (lv.tags || []).filter(t => !t.startsWith('primary:')).slice(0, 5),
        toneTags: [],
        audienceTags: ['developers', 'creators'],
        genderPresentation: gender,
        metadataQuality: 'curated',
      },
      modelCard: {
        modelName: `LMNT ${voiceType === 'professional' ? 'Professional' : 'Instant'}`,
        architecture: voiceType,
        providerType: 'cloud_provider',
        providerUrl: 'https://lmnt.com',
        license: 'Proprietary (LMNT API)',
        commercialUse: true,
        sampleRate: 24000,
        outputFormat: 'mp3',
        streamingCapable: true,
        totalVoices: systemVoices.length,
      },
      samples: [{
        id: `s-${id}`,
        label: 'Default',
        text: 'The morning sun cast long shadows across the quiet street, and somewhere in the distance a church bell rang, marking the start of a brand new day.',
        audioUrl: `/audio/samples/${id}.mp3`,
      }],
      variants: [{
        sourceKey: lv.id,
        label: lv.name,
        engine: 'lmnt',
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
        const text = voice.samples[0].text;
        const size = await downloadAudio(lv.id, text, audioPath);
        console.log(`  [${i+1}/${systemVoices.length}] ✓ ${lv.name.padEnd(20)} ${size} bytes`);
        sampled++;
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.log(`  [${i+1}/${systemVoices.length}] ✗ ${lv.name.padEnd(20)} ${e.message.slice(0, 80)}`);
      }
    }
  }

  writeFileSync(VOICES_PATH, JSON.stringify({ voices }, null, 2));
  console.log(`\n✅ LMNT: ${added} added, ${sampled} sampled`);
  console.log(`📊 Total catalog: ${voices.length} voices`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
