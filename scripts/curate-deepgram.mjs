#!/usr/bin/env node
/**
 * curate-deepgram.mjs — Add all Deepgram Aura & Aura-2 TTS voices to catalog.
 * Generates audio samples via Deepgram's TTS API.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import https from 'https';

const VOICES_PATH = 'apps/web/static/data/voices.json';
const AUDIO_DIR = 'apps/web/static/audio/samples';
const DG_VOICES_PATH = '/tmp/deepgram-tts-voices.json';
const API_KEY = process.env.DEEPGRAM_API_KEY || '972076a4f51be9a7bf62129047a80cd54b0cfab7';

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

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Sample text by language
const SAMPLE_TEXT = {
  en: "Hello! This is a preview of how I sound in natural conversation. I can help with customer service, narration, and more.",
  es: "¡Hola! Esta es una muestra de cómo sueno en una conversación natural. Puedo ayudar con atención al cliente y narración.",
  de: "Hallo! Dies ist eine Vorschau meiner Stimme in natürlicher Konversation. Ich kann bei Kundenservice und Erzählung helfen.",
  fr: "Bonjour! Voici un aperçu de ma voix dans une conversation naturelle. Je peux aider avec le service client et la narration.",
  it: "Ciao! Questa è un'anteprima di come suono in una conversazione naturale. Posso aiutare con il servizio clienti e la narrazione.",
  nl: "Hallo! Dit is een voorbeeld van hoe ik klink in een natuurlijk gesprek. Ik kan helpen met klantenservice en vertelling.",
  ja: "こんにちは！これは自然な会話での私の声のプレビューです。カスタマーサービスやナレーションのお手伝いができます。",
};

const STANDARD_EN = 'The morning sun cast long shadows across the quiet street, and somewhere in the distance a church bell rang, marking the start of a brand new day.';

function getSampleText(voice) {
  const lang = voice.languages?.[0]?.split('-')[0] || 'en';
  if (lang === 'en') return STANDARD_EN;
  return SAMPLE_TEXT[lang] || STANDARD_EN;
}

function downloadAudio(voiceName, text, outPath) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ text });
    const opts = {
      hostname: 'api.deepgram.com',
      port: 443,
      path: `/v1/speak?model=${voiceName}`,
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_KEY}`,
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
  const dgVoices = JSON.parse(readFileSync(DG_VOICES_PATH, 'utf8'));
  const raw = JSON.parse(readFileSync(VOICES_PATH, 'utf8'));
  const voices = raw.voices;
  const existingKeys = new Set(voices.map(v => `${v.providerId}:${v.providerVoiceId || v.name}`));

  let added = 0;
  let sampled = 0;
  let skipped = 0;

  for (let i = 0; i < dgVoices.length; i++) {
    const dg = dgVoices[i];
    const key = `deepgram:${dg.canonical_name}`;

    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    const id = stableId(key);
    const md = dg.metadata || {};
    const name = capitalize(dg.name);
    const arch = dg.architecture === 'aura-2' ? 'Aura 2' : 'Aura';
    const lang0 = dg.languages?.[0] || 'en';
    const langCode = lang0.includes('-') ? lang0 : `${lang0}-${lang0.toUpperCase()}`;
    const gender = md.tags?.find(t => ['masculine', 'feminine'].includes(t)) || 'neutral';
    const genderPres = gender === 'masculine' ? 'male' : gender === 'feminine' ? 'female' : 'neutral';
    const accent = md.accent || 'American';
    const age = md.age || 'Adult';
    const tags = [
      ...(md.tags || []).filter(t => !['masculine','feminine'].includes(t)),
      dg.architecture,
      `accent-${accent.toLowerCase().replace(/\s+/g, '-')}`,
      genderPres,
    ];

    const desc = `${accent}-accented ${genderPres} voice (${age.toLowerCase()}) with ${(md.tags || []).filter(t => !['masculine','feminine'].includes(t)).slice(0, 3).join(', ')} qualities. ${arch} architecture.`;

    const useCases = (md.use_cases || []).map(u => u.toLowerCase());

    const voice = {
      id,
      name: `${name} (${arch})`,
      provider: 'Deepgram',
      providerId: 'deepgram',
      providerVoiceId: dg.canonical_name,
      description: desc,
      tags,
      languages: dg.languages || ['en'],
      qualityTier: dg.architecture === 'aura-2' ? 'premium' : 'standard',
      licenseNotes: 'Deepgram API terms. Pay-per-character pricing. $200 free credit on signup.',
      audioUrl: `/audio/samples/${id}.mp3`,
      imageUrl: `/images/voices/${id}.jpg`,
      metadata: {
        shortLabel: `${name} — Deepgram ${arch}`,
        searchDescription: `Deepgram ${name}: ${desc}`,
        machineTags: ['deepgram', dg.architecture, genderPres, accent.toLowerCase()],
        useCases,
        toneTags: (md.tags || []).filter(t => !['masculine', 'feminine'].includes(t)).slice(0, 5),
        audienceTags: ['developers', 'enterprises'],
        genderPresentation: genderPres,
        agePresentation: age.toLowerCase(),
        metadataQuality: 'curated',
      },
      modelCard: {
        modelName: `Deepgram ${arch} — ${name}`,
        architecture: dg.architecture,
        providerType: 'cloud_provider',
        providerUrl: 'https://deepgram.com/aura',
        license: 'Proprietary (Deepgram API)',
        commercialUse: true,
        sampleRate: 24000,
        outputFormat: 'mp3',
        streamingCapable: true,
        accent,
        age,
        deepgramColor: md.color,
        deepgramImage: md.image,
        deepgramSample: md.sample,
        deepgramUuid: dg.uuid,
        totalVoices: dgVoices.length,
        useCases,
      },
      samples: [{
        id: `s-${id}`,
        label: 'Default',
        text: getSampleText(dg),
        audioUrl: `/audio/samples/${id}.mp3`,
      }],
      variants: [{
        sourceKey: dg.canonical_name,
        label: name,
        engine: dg.architecture,
        supportsStreaming: true,
        supportsSsml: false,
        maxChars: 2000,
      }],
    };

    voices.push(voice);
    existingKeys.add(key);
    added++;

    // Generate audio sample
    const audioPath = `${AUDIO_DIR}/${id}.mp3`;
    if (!existsSync(audioPath)) {
      const text = getSampleText(dg);
      try {
        const size = await downloadAudio(dg.canonical_name, text, audioPath);
        console.log(`  [${i + 1}/${dgVoices.length}] ✓ ${voice.name.padEnd(30)} ${size} bytes`);
        sampled++;
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.log(`  [${i + 1}/${dgVoices.length}] ✗ ${voice.name.padEnd(30)} ${e.message}`);
      }
    } else {
      console.log(`  [${i + 1}/${dgVoices.length}] skip audio: ${voice.name} (exists)`);
    }
  }

  writeFileSync(VOICES_PATH, JSON.stringify({ voices }, null, 2));
  console.log(`\n✅ Added ${added} Deepgram voices, ${sampled} samples generated, ${skipped} skipped`);
  console.log(`📊 Total catalog: ${voices.length} voices`);
}

main().catch(e => {
  console.error('❌', e);
  process.exit(1);
});
