#!/usr/bin/env node
/**
 * expand-voices-batch2.mjs — Add Orpheus, Chatterbox Turbo, and Edge TTS voices.
 *
 * Adds voice catalog entries (no audio generation — separate scripts for that).
 */
import { readFileSync, writeFileSync } from 'fs';
import crypto from 'crypto';

const VOICES_PATH = 'apps/web/static/data/voices.json';

function ulid() {
  // Deterministic ULID-like ID from random bytes
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const now = Date.now();
  let id = '';
  // Timestamp (10 chars)
  let ts = now;
  for (let i = 9; i >= 0; i--) {
    id = chars[ts % 32] + id;
    ts = Math.floor(ts / 32);
  }
  // Random (16 chars)
  const rand = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) {
    id += chars[rand[i] % 32];
  }
  return id;
}

// Stable ID from seed string
function stableId(seed) {
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let id = '';
  for (let i = 0; i < 26; i++) {
    id += chars[parseInt(hash.substr(i % 32, 2), 16) % 32];
  }
  return id;
}

const raw = JSON.parse(readFileSync(VOICES_PATH, 'utf8'));
const voices = raw.voices;
const existingIds = new Set(voices.map(v => v.id));
const existingKeys = new Set(voices.map(v => `${v.providerId}:${v.providerVoiceId || v.name}`));

function addVoice(v) {
  const key = `${v.providerId}:${v.providerVoiceId || v.name}`;
  if (existingKeys.has(key)) {
    console.log(`  skip: ${key} (exists)`);
    return null;
  }
  const id = stableId(key);
  const voice = {
    id,
    ...v,
    audioUrl: `/audio/samples/${id}.mp3`,
    imageUrl: `/images/voices/${id}.jpg`,
    samples: [{
      id: `s-${id}`,
      label: 'Default',
      text: v._sampleText || 'The quick brown fox jumps over the lazy dog near the riverbank.',
      audioUrl: `/audio/samples/${id}.mp3`,
    }],
    variants: v.variants || [],
  };
  delete voice._sampleText;
  voices.push(voice);
  existingKeys.add(key);
  console.log(`  add: ${v.name} (${v.providerId}) → ${id}`);
  return id;
}

// ─── Orpheus TTS (8 voices) ───
console.log('\n=== Orpheus TTS ===');
const orpheusSpeakers = [
  { name: 'Tara', voiceId: 'tara', gender: 'female', desc: 'Conversational female voice with natural intonation and clear articulation.' },
  { name: 'Leah', voiceId: 'leah', gender: 'female', desc: 'Warm female voice with a friendly, approachable tone.' },
  { name: 'Jess', voiceId: 'jess', gender: 'female', desc: 'Energetic, youthful female voice suited for casual content.' },
  { name: 'Mia', voiceId: 'mia', gender: 'female', desc: 'Soft-spoken female voice with gentle delivery and calm presence.' },
  { name: 'Zoe', voiceId: 'zoe', gender: 'female', desc: 'Calm, soothing female voice ideal for meditation and relaxation content.' },
  { name: 'Leo', voiceId: 'leo', gender: 'male', desc: 'Authoritative male voice with a deep tone, great for narration.' },
  { name: 'Dan', voiceId: 'dan', gender: 'male', desc: 'Friendly, casual male voice for everyday conversational use.' },
  { name: 'Zac', voiceId: 'zac', gender: 'male', desc: 'Upbeat male voice with clear enunciation and natural pacing.' },
];

for (const s of orpheusSpeakers) {
  addVoice({
    name: s.name,
    provider: 'Orpheus TTS',
    providerId: 'orpheus',
    providerVoiceId: s.voiceId,
    description: s.desc,
    tags: ['conversational', 'expressive', 'emotion-control', 'local', 'mlx', 'open-model', 'llama-based'],
    languages: ['en-US'],
    qualityTier: 'premium',
    licenseNotes: 'Apache 2.0',
    metadata: {
      shortLabel: `${s.name} — Orpheus`,
      searchDescription: `${s.name}: ${s.desc}`,
      machineTags: ['orpheus', 'llama', 'emotion', 'mlx', 'local', s.gender],
      useCases: ['conversational', 'narration', 'podcasts', 'audiobooks', 'characters'],
      toneTags: ['natural', 'expressive', 'human-like'],
      audienceTags: ['developers', 'creators', 'researchers'],
      genderPresentation: s.gender,
      metadataQuality: 'curated',
    },
    modelCard: {
      modelName: 'Orpheus 3B 0.1 Fine-tuned',
      modelVersion: '0.1-ft',
      architecture: 'LLaMA 3.2 3B',
      modelSize: '3B parameters (4-bit: ~1.8GB)',
      baseModel: 'meta-llama/Llama-3.2-3B-Instruct',
      huggingFaceUrl: 'https://huggingface.co/mlx-community/orpheus-3b-0.1-ft-4bit',
      providerType: 'open_model',
      providerUrl: 'https://github.com/canopyai/Orpheus-TTS',
      license: 'Apache 2.0',
      commercialUse: true,
      supportsCloning: true,
      supportsEmotionTags: true,
      emotionTags: ['laugh', 'sigh', 'gasp', 'cry', 'whisper'],
      sampleRate: 24000,
      outputFormat: 'wav',
      streamingCapable: true,
      latencyMs: 200,
      totalSpeakers: 8,
      trainingData: 'Fine-tuned on conversational speech data',
      specialCapabilities: ['Zero-shot voice cloning', 'Emotion control via tags', 'Real-time streaming (~200ms latency)'],
    },
    variants: [{
      sourceKey: s.voiceId,
      label: s.name,
      engine: 'orpheus',
      supportsStreaming: true,
      supportsSsml: false,
      maxChars: 2000,
    }],
    _sampleText: `Hello, I'm ${s.name}. I can express emotions naturally, from excitement to calm reflection. The weather today is absolutely beautiful!`,
  });
}

// ─── Chatterbox Turbo ───
console.log('\n=== Chatterbox Turbo ===');
addVoice({
  name: 'Chatterbox Turbo',
  provider: 'Chatterbox Turbo',
  providerId: 'chatterbox-turbo',
  providerVoiceId: 'default',
  description: 'Faster variant of Chatterbox TTS with significantly reduced inference time while maintaining natural speech quality.',
  tags: ['fast', 'conversational', 'local', 'mlx', 'open-model', 'voice-cloning'],
  languages: ['en-US'],
  qualityTier: 'premium',
  licenseNotes: 'Apache 2.0',
  metadata: {
    shortLabel: 'Turbo — Chatterbox',
    searchDescription: 'Chatterbox Turbo: Fast, natural speech synthesis with voice cloning support.',
    machineTags: ['chatterbox', 'turbo', 'fast', 'mlx', 'local'],
    useCases: ['conversational', 'real-time', 'assistants', 'interactive'],
    toneTags: ['natural', 'fast', 'responsive'],
    audienceTags: ['developers', 'creators'],
    metadataQuality: 'curated',
  },
  modelCard: {
    modelName: 'Chatterbox Turbo TTS',
    architecture: 'chatterbox_turbo',
    modelSize: '4-bit quantized',
    huggingFaceUrl: 'https://huggingface.co/mlx-community/Chatterbox-Turbo-TTS-4bit',
    providerType: 'open_model',
    license: 'Apache 2.0',
    commercialUse: true,
    supportsCloning: true,
    sampleRate: 24000,
    outputFormat: 'wav',
    streamingCapable: false,
    specialCapabilities: ['Voice cloning via reference audio', 'Significantly faster than standard Chatterbox'],
  },
  variants: [{
    sourceKey: 'default',
    label: 'Default',
    engine: 'chatterbox-turbo',
    supportsStreaming: false,
    supportsSsml: false,
    maxChars: 2000,
  }],
});

// ─── Edge TTS (47 English voices) ───
console.log('\n=== Edge TTS ===');
const edgeVoices = [
  // US English
  { short: 'en-US-AriaNeural', name: 'Aria', gender: 'female', locale: 'en-US', desc: 'Versatile US female voice with expressive range, suitable for chat, narration, and customer service.' },
  { short: 'en-US-JennyNeural', name: 'Jenny', gender: 'female', locale: 'en-US', desc: 'Warm, professional US female voice ideal for corporate narration and e-learning.' },
  { short: 'en-US-AnaNeural', name: 'Ana', gender: 'female', locale: 'en-US', desc: 'Child-like US female voice designed for kids\' content and educational material.' },
  { short: 'en-US-AvaNeural', name: 'Ava', gender: 'female', locale: 'en-US', desc: 'Clear, modern US female voice suited for assistants and conversational AI.' },
  { short: 'en-US-AvaMultilingualNeural', name: 'Ava Multilingual', gender: 'female', locale: 'en-US', desc: 'Multilingual US female voice that can switch between languages seamlessly.' },
  { short: 'en-US-EmmaNeural', name: 'Emma', gender: 'female', locale: 'en-US', desc: 'Bright, enthusiastic US female voice for news, promotions, and announcements.' },
  { short: 'en-US-EmmaMultilingualNeural', name: 'Emma Multilingual', gender: 'female', locale: 'en-US', desc: 'Multilingual version of Emma with natural language switching.' },
  { short: 'en-US-MichelleNeural', name: 'Michelle', gender: 'female', locale: 'en-US', desc: 'Balanced US female voice with a friendly, approachable quality.' },
  { short: 'en-US-AndrewNeural', name: 'Andrew', gender: 'male', locale: 'en-US', desc: 'Conversational US male voice with a natural, relaxed tone.' },
  { short: 'en-US-AndrewMultilingualNeural', name: 'Andrew Multilingual', gender: 'male', locale: 'en-US', desc: 'Multilingual US male voice for international content.' },
  { short: 'en-US-BrianNeural', name: 'Brian', gender: 'male', locale: 'en-US', desc: 'Strong, clear US male voice for narration and professional content.' },
  { short: 'en-US-BrianMultilingualNeural', name: 'Brian Multilingual', gender: 'male', locale: 'en-US', desc: 'Multilingual US male voice with natural cross-language delivery.' },
  { short: 'en-US-ChristopherNeural', name: 'Christopher', gender: 'male', locale: 'en-US', desc: 'Authoritative US male voice suited for news and documentary narration.' },
  { short: 'en-US-EricNeural', name: 'Eric', gender: 'male', locale: 'en-US', desc: 'Mature US male voice with steady delivery for professional use.' },
  { short: 'en-US-GuyNeural', name: 'Guy', gender: 'male', locale: 'en-US', desc: 'Neutral US male voice versatile enough for any general-purpose application.' },
  { short: 'en-US-RogerNeural', name: 'Roger', gender: 'male', locale: 'en-US', desc: 'Deep, resonant US male voice ideal for audiobooks and podcasts.' },
  { short: 'en-US-SteffanNeural', name: 'Steffan', gender: 'male', locale: 'en-US', desc: 'Youthful US male voice with an energetic, engaging quality.' },
  // British English
  { short: 'en-GB-SoniaNeural', name: 'Sonia', gender: 'female', locale: 'en-GB', desc: 'Professional British female voice with clear diction for business content.' },
  { short: 'en-GB-LibbyNeural', name: 'Libby', gender: 'female', locale: 'en-GB', desc: 'Warm British female voice with a natural, conversational feel.' },
  { short: 'en-GB-MaisieNeural', name: 'Maisie', gender: 'female', locale: 'en-GB', desc: 'Youthful British female voice for casual and creative content.' },
  { short: 'en-GB-RyanNeural', name: 'Ryan', gender: 'male', locale: 'en-GB', desc: 'Confident British male voice for narration, training, and media.' },
  { short: 'en-GB-ThomasNeural', name: 'Thomas', gender: 'male', locale: 'en-GB', desc: 'Refined British male voice with articulate delivery for formal content.' },
  // Australian English
  { short: 'en-AU-NatashaNeural', name: 'Natasha', gender: 'female', locale: 'en-AU', desc: 'Friendly Australian female voice for customer service and media.' },
  { short: 'en-AU-WilliamMultilingualNeural', name: 'William', gender: 'male', locale: 'en-AU', desc: 'Australian male multilingual voice for international and regional content.' },
  // Canadian English
  { short: 'en-CA-ClaraNeural', name: 'Clara', gender: 'female', locale: 'en-CA', desc: 'Clear Canadian female voice suited for education and customer service.' },
  { short: 'en-CA-LiamNeural', name: 'Liam', gender: 'male', locale: 'en-CA', desc: 'Friendly Canadian male voice for conversational and commercial use.' },
  // Indian English
  { short: 'en-IN-NeerjaNeural', name: 'Neerja', gender: 'female', locale: 'en-IN', desc: 'Indian English female voice with clear pronunciation for diverse audiences.' },
  { short: 'en-IN-NeerjaExpressiveNeural', name: 'Neerja Expressive', gender: 'female', locale: 'en-IN', desc: 'Expressive Indian English female voice with enhanced emotional range.' },
  { short: 'en-IN-PrabhatNeural', name: 'Prabhat', gender: 'male', locale: 'en-IN', desc: 'Indian English male voice for professional and educational content.' },
  // Irish English
  { short: 'en-IE-ConnorNeural', name: 'Connor', gender: 'male', locale: 'en-IE', desc: 'Irish English male voice with a distinctive, warm accent.' },
  { short: 'en-IE-EmilyNeural', name: 'Emily', gender: 'female', locale: 'en-IE', desc: 'Irish English female voice with a natural, engaging quality.' },
  // Hong Kong English
  { short: 'en-HK-YanNeural', name: 'Yan', gender: 'female', locale: 'en-HK', desc: 'Hong Kong English female voice for regional content.' },
  { short: 'en-HK-SamNeural', name: 'Sam', gender: 'male', locale: 'en-HK', desc: 'Hong Kong English male voice for business and media.' },
  // Kenyan English
  { short: 'en-KE-AsiliaNeural', name: 'Asilia', gender: 'female', locale: 'en-KE', desc: 'Kenyan English female voice representing East African speech patterns.' },
  { short: 'en-KE-ChilembaNeural', name: 'Chilemba', gender: 'male', locale: 'en-KE', desc: 'Kenyan English male voice for regional and educational content.' },
  // Nigerian English
  { short: 'en-NG-AbeoNeural', name: 'Abeo', gender: 'male', locale: 'en-NG', desc: 'Nigerian English male voice for West African content and media.' },
  { short: 'en-NG-EzinneNeural', name: 'Ezinne', gender: 'female', locale: 'en-NG', desc: 'Nigerian English female voice with warm, expressive delivery.' },
  // New Zealand English
  { short: 'en-NZ-MitchellNeural', name: 'Mitchell', gender: 'male', locale: 'en-NZ', desc: 'New Zealand English male voice for regional media and content.' },
  { short: 'en-NZ-MollyNeural', name: 'Molly', gender: 'female', locale: 'en-NZ', desc: 'New Zealand English female voice with friendly, natural delivery.' },
  // Philippine English
  { short: 'en-PH-JamesNeural', name: 'James', gender: 'male', locale: 'en-PH', desc: 'Philippine English male voice for Southeast Asian content.' },
  { short: 'en-PH-RosaNeural', name: 'Rosa', gender: 'female', locale: 'en-PH', desc: 'Philippine English female voice for customer service and media.' },
  // Singapore English
  { short: 'en-SG-LunaNeural', name: 'Luna', gender: 'female', locale: 'en-SG', desc: 'Singaporean English female voice for Southeast Asian audiences.' },
  { short: 'en-SG-WayneNeural', name: 'Wayne', gender: 'male', locale: 'en-SG', desc: 'Singaporean English male voice for business and educational use.' },
  // South African English
  { short: 'en-ZA-LeahNeural', name: 'Leah', gender: 'female', locale: 'en-ZA', desc: 'South African English female voice for regional media.' },
  { short: 'en-ZA-LukeNeural', name: 'Luke', gender: 'male', locale: 'en-ZA', desc: 'South African English male voice with clear, professional delivery.' },
  // Tanzanian English
  { short: 'en-TZ-ElimuNeural', name: 'Elimu', gender: 'male', locale: 'en-TZ', desc: 'Tanzanian English male voice for East African educational content.' },
  { short: 'en-TZ-ImaniNeural', name: 'Imani', gender: 'female', locale: 'en-TZ', desc: 'Tanzanian English female voice with warm, engaging tone.' },
];

for (const ev of edgeVoices) {
  const localeTag = ev.locale.toLowerCase();
  const regionName = {
    'en-us': 'US', 'en-gb': 'British', 'en-au': 'Australian', 'en-ca': 'Canadian',
    'en-in': 'Indian', 'en-ie': 'Irish', 'en-hk': 'Hong Kong', 'en-ke': 'Kenyan',
    'en-ng': 'Nigerian', 'en-nz': 'New Zealand', 'en-ph': 'Philippine',
    'en-sg': 'Singaporean', 'en-za': 'South African', 'en-tz': 'Tanzanian',
  }[localeTag] || localeTag;

  const isMultilingual = ev.short.includes('Multilingual');

  addVoice({
    name: `${ev.name} (Edge)`,
    provider: 'Edge TTS',
    providerId: 'edge-tts',
    providerVoiceId: ev.short,
    description: ev.desc,
    tags: [
      'neural', 'free', 'no-api-key', localeTag,
      ...(isMultilingual ? ['multilingual'] : []),
      ev.gender,
      regionName.toLowerCase().replace(/\s+/g, '-'),
    ],
    languages: isMultilingual ? ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN', 'ko-KR'] : [ev.locale],
    qualityTier: 'premium',
    licenseNotes: 'Free for personal and development use via Microsoft Edge TTS API. Same neural voices as Azure Speech. No API key required.',
    metadata: {
      shortLabel: `${ev.name} — Edge ${regionName}`,
      searchDescription: `Edge TTS ${ev.name}: ${ev.desc}`,
      machineTags: ['edge-tts', 'microsoft', 'neural', 'free', ev.gender, localeTag],
      useCases: ['narration', 'assistants', 'e-learning', 'accessibility', 'prototyping'],
      toneTags: ['clear', 'professional', 'natural'],
      audienceTags: ['developers', 'creators', 'educators'],
      genderPresentation: ev.gender,
      agePresentation: ev.short.includes('Ana') ? 'child' : 'adult',
      metadataQuality: 'curated',
    },
    modelCard: {
      modelName: ev.short,
      architecture: 'Azure Neural TTS',
      providerType: 'cloud_provider',
      providerUrl: 'https://github.com/rany2/edge-tts',
      license: 'Free (Microsoft Edge TTS API)',
      commercialUse: false,
      sampleRate: 24000,
      outputFormat: 'mp3',
      streamingCapable: true,
      supportsSSML: true,
      totalVoices: 322,
      totalEnglishVoices: 47,
      region: regionName,
      locale: ev.locale,
      specialCapabilities: isMultilingual
        ? ['Multilingual speech', 'SSML support', 'No API key required', 'Real-time streaming']
        : ['SSML support', 'No API key required', 'Real-time streaming'],
    },
    variants: [{
      sourceKey: ev.short,
      label: ev.name,
      engine: 'edge-tts',
      supportsStreaming: true,
      supportsSsml: true,
      maxChars: 5000,
    }],
    _sampleText: `Hello! I'm ${ev.name}, speaking ${regionName} English. This is a preview of how I sound in natural conversation.`,
  });
}

// Write back
writeFileSync(VOICES_PATH, JSON.stringify({ voices }, null, 2));
console.log(`\n✅ Total voices: ${voices.length}`);
