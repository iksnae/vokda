#!/usr/bin/env node
/**
 * expand-local-voices.mjs
 * 
 * 1. Add 10 Bark English speaker voices + 1 Announcer voice (11 new)
 * 2. Split Dia into S1/S2 speaker entries + dialogue mode entry (2 new, update existing)
 * 3. Add Marvis conversational_b voice (1 new, update existing to conversational_a)
 * 4. Update metadata on all single-voice providers to accurately reflect capabilities
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import crypto from 'crypto';

const VOICES_PATH = 'apps/web/static/data/voices.json';
const AUDIO_DIR = 'apps/web/static/audio/samples';
const IMAGES_DIR = 'apps/web/static/images/voices';

const raw = JSON.parse(readFileSync(VOICES_PATH, 'utf8'));
const voices = Array.isArray(raw) ? raw : raw.voices ?? Object.values(raw);

function ulid() {
  // Simple ULID-like: timestamp + random
  const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const r = crypto.randomBytes(10).toString('hex').toUpperCase().slice(0, 16);
  return t + r;
}

function generateVoiceImage(id, name) {
  const outPath = `${IMAGES_DIR}/${id}.jpg`;
  if (existsSync(outPath)) return;
  
  // Deterministic color from hash
  const hash = crypto.createHash('md5').update(id + name).digest('hex');
  const hue = parseInt(hash.slice(0, 3), 16) % 360;
  const sat = 50 + (parseInt(hash.slice(3, 5), 16) % 30);
  const light = 35 + (parseInt(hash.slice(5, 7), 16) % 25);
  const hue2 = (hue + 40 + parseInt(hash.slice(7, 9), 16) % 80) % 360;
  
  const initials = name.split(/[\s-]+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  
  try {
    execFileSync('magick', [
      '-size', '400x400',
      `xc:hsl(${hue},${sat}%,${light}%)`,
      '-fill', `hsl(${hue2},${sat}%,${light + 15}%)`,
      '-draw', `circle 200,200 200,50`,
      '-fill', 'white',
      '-font', 'Helvetica-Bold',
      '-pointsize', '120',
      '-gravity', 'center',
      '-annotate', '0', initials,
      '-quality', '85',
      outPath
    ]);
    console.log(`  🖼️  ${outPath}`);
  } catch {
    console.log(`  ⚠️  Could not generate image for ${name}`);
  }
}

// ── Helper: base model card for Bark ──
function barkModelCard(speakerLabel, presetId) {
  return {
    modelName: 'Bark Small',
    modelVersion: 'small',
    architecture: 'bark',
    parameterCount: '~100M',
    quantization: 'none',
    providerType: 'local',
    providerUrl: 'https://huggingface.co/suno/bark',
    huggingFaceUrl: 'https://huggingface.co/mlx-community/bark-small',
    license: 'MIT',
    commercialUse: true,
    inputFormats: ['plain_text'],
    outputFormats: ['wav'],
    sampleRate: 24000,
    maxInputLength: 250,
    streamingSupport: false,
    emotionControl: true,
    ssmlSupport: false,
    multiLanguage: true,
    supportedLanguages: ['en', 'de', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tr', 'zh'],
    runnableLocal: true,
    hardwareRequirements: 'Apple Silicon Mac (M1+), ~500MB RAM',
    inferenceSpeed: '~0.8x realtime on M1',
    trainingData: 'Proprietary (Suno AI)',
    primaryLanguage: 'en',
    knownLimitations: ['Short-form generation only (~15s max)', 'Non-deterministic output', 'May produce artifacts at boundaries'],
    presetId,
    speakerLabel,
    totalPresets: 261,
    totalEnglishPresets: 10,
    supportedPresetLanguages: 13,
  };
}

// ── 1. BARK: Add 10 English speakers + Announcer ──
const barkSpeakers = [
  { n: 0, name: 'Bark EN-0', desc: 'Bark English speaker preset 0 — distinct voice character generated from pretrained embedding.', tone: ['clear', 'natural'] },
  { n: 1, name: 'Bark EN-1', desc: 'Bark English speaker preset 1 — distinct voice with unique timbre and cadence.', tone: ['warm', 'conversational'] },
  { n: 2, name: 'Bark EN-2', desc: 'Bark English speaker preset 2 — varied pitch and rhythm compared to other presets.', tone: ['expressive', 'dynamic'] },
  { n: 3, name: 'Bark EN-3', desc: 'Bark English speaker preset 3 — slightly lower register with natural pacing.', tone: ['deep', 'steady'] },
  { n: 4, name: 'Bark EN-4', desc: 'Bark English speaker preset 4 — bright, upbeat character with clear articulation.', tone: ['bright', 'articulate'] },
  { n: 5, name: 'Bark EN-5', desc: 'Bark English speaker preset 5 — relaxed delivery with smooth transitions.', tone: ['relaxed', 'smooth'] },
  { n: 6, name: 'Bark EN-6', desc: 'Bark English speaker preset 6 — energetic voice with varied intonation patterns.', tone: ['energetic', 'varied'] },
  { n: 7, name: 'Bark EN-7', desc: 'Bark English speaker preset 7 — measured pace with deliberate emphasis.', tone: ['measured', 'deliberate'] },
  { n: 8, name: 'Bark EN-8', desc: 'Bark English speaker preset 8 — lighter voice with quick, natural phrasing.', tone: ['light', 'quick'] },
  { n: 9, name: 'Bark EN-9', desc: 'Bark English speaker preset 9 — neutral delivery with balanced prosody.', tone: ['neutral', 'balanced'] },
];

const barkAnnouncer = {
  name: 'Bark Announcer',
  desc: 'Bark built-in announcer voice — bold, projected delivery ideal for headlines and announcements.',
  tone: ['bold', 'projected', 'authoritative'],
};

const newBarkVoices = [];

for (const s of barkSpeakers) {
  const id = ulid();
  const audioSrc = `/tmp/bark-en-${s.n}.mp3`;
  const audioDst = `${AUDIO_DIR}/${id}.mp3`;
  
  if (existsSync(audioSrc)) {
    copyFileSync(audioSrc, audioDst);
    console.log(`  🔊 ${audioDst}`);
  }
  
  generateVoiceImage(id, s.name);
  
  newBarkVoices.push({
    id,
    name: s.name,
    provider: 'Bark',
    providerId: 'bark',
    providerVoiceId: `v2/en_speaker_${s.n}`,
    description: s.desc,
    tags: ['mlx', 'local', 'open-source', 'generative', 'multilingual', `preset-${s.n}`],
    languages: ['en-US'],
    qualityTier: 'standard',
    licenseNotes: 'MIT license — full commercial use',
    audioUrl: `/audio/samples/${id}.mp3`,
    imageUrl: `/images/voices/${id}.jpg`,
    metadata: {
      shortLabel: `Bark preset ${s.n}`,
      toneTags: s.tone,
      useCases: ['Creative projects', 'Prototyping', 'Short-form narration', 'Game dialogue'],
      genderPresentation: 'neutral',
      agePresentation: 'adult',
    },
    samples: [{
      id: `sample-${id}`,
      text: 'The morning sun cast long shadows across the quiet street, and somewhere in the distance a church bell rang, marking the start of a brand new day.',
      audioUrl: `/audio/samples/${id}.mp3`,
    }],
    variants: [{
      id: `variant-${id}`,
      label: `Bark v2 EN Speaker ${s.n}`,
      sourceType: 'open_model',
      sourceKey: `bark:small:v2_en_speaker_${s.n}`,
      supportsSsml: false,
    }],
    modelCard: barkModelCard(`v2/en_speaker_${s.n}`, `v2/en_speaker_${s.n}`),
  });
}

// Announcer
{
  const id = ulid();
  const audioSrc = '/tmp/bark-announcer.mp3';
  const audioDst = `${AUDIO_DIR}/${id}.mp3`;
  if (existsSync(audioSrc)) {
    copyFileSync(audioSrc, audioDst);
    console.log(`  🔊 ${audioDst}`);
  }
  generateVoiceImage(id, barkAnnouncer.name);
  
  newBarkVoices.push({
    id,
    name: barkAnnouncer.name,
    provider: 'Bark',
    providerId: 'bark',
    providerVoiceId: 'announcer',
    description: barkAnnouncer.desc,
    tags: ['mlx', 'local', 'open-source', 'generative', 'announcer', 'multilingual'],
    languages: ['en-US'],
    qualityTier: 'standard',
    licenseNotes: 'MIT license — full commercial use',
    audioUrl: `/audio/samples/${id}.mp3`,
    imageUrl: `/images/voices/${id}.jpg`,
    metadata: {
      shortLabel: 'Bold announcer',
      toneTags: barkAnnouncer.tone,
      useCases: ['Announcements', 'Headlines', 'Trailers', 'Podcast intros'],
      genderPresentation: 'neutral',
      agePresentation: 'adult',
    },
    samples: [{
      id: `sample-${id}`,
      text: 'The morning sun cast long shadows across the quiet street, and somewhere in the distance a church bell rang, marking the start of a brand new day.',
      audioUrl: `/audio/samples/${id}.mp3`,
    }],
    variants: [{
      id: `variant-${id}`,
      label: 'Bark Announcer Preset',
      sourceType: 'open_model',
      sourceKey: 'bark:small:announcer',
      supportsSsml: false,
    }],
    modelCard: barkModelCard('announcer', 'announcer'),
  });
}

console.log(`\n✅ Created ${newBarkVoices.length} new Bark voices`);

// ── 2. DIA: Add S2 entry + Dialogue entry, update existing to be S1 ──
const diaIdx = voices.findIndex(v => v.providerId === 'dia');
const existingDia = voices[diaIdx];

// Update existing Dia to be explicitly S1
existingDia.name = 'Dia Speaker 1';
existingDia.providerVoiceId = 'S1';
existingDia.description = 'Dia 1.6B Speaker 1 — primary voice in Nari Labs\' dialogue-native generative model. Clear, articulate delivery.';
existingDia.metadata.shortLabel = 'Dia primary speaker';
existingDia.tags = [...new Set([...existingDia.tags, 'multi-speaker', 'dialogue'])];
if (existingDia.modelCard) {
  existingDia.modelCard.multiSpeaker = true;
  existingDia.modelCard.totalSpeakers = 2;
  existingDia.modelCard.speakerTag = '[S1]';
  existingDia.modelCard.dialogueCapable = true;
  existingDia.modelCard.voiceCloning = true;
  existingDia.modelCard.voiceCloningMethod = 'ref_audio';
}
// Backfill the S1 audio if we have a better one
const diaS1Src = '/tmp/dia-s1-narrate.mp3';
if (existsSync(diaS1Src)) {
  copyFileSync(diaS1Src, `${AUDIO_DIR}/${existingDia.id}.mp3`);
  console.log(`  🔊 Updated Dia S1 audio`);
}

// New: Dia Speaker 2
const diaS2Id = ulid();
{
  const audioSrc = '/tmp/dia-s2-narrate.mp3';
  if (existsSync(audioSrc)) {
    copyFileSync(audioSrc, `${AUDIO_DIR}/${diaS2Id}.mp3`);
    console.log(`  🔊 ${AUDIO_DIR}/${diaS2Id}.mp3`);
  }
  generateVoiceImage(diaS2Id, 'Dia Speaker 2');
}

const diaS2 = {
  id: diaS2Id,
  name: 'Dia Speaker 2',
  provider: 'Dia',
  providerId: 'dia',
  providerVoiceId: 'S2',
  description: 'Dia 1.6B Speaker 2 — secondary voice in dialogue generation. Distinct timbre from Speaker 1, used as conversational partner.',
  tags: ['mlx', 'local', 'open-source', 'dialogue', 'multi-speaker', 'generative'],
  languages: ['en-US'],
  qualityTier: 'standard',
  licenseNotes: existingDia.licenseNotes,
  audioUrl: `/audio/samples/${diaS2Id}.mp3`,
  imageUrl: `/images/voices/${diaS2Id}.jpg`,
  metadata: {
    shortLabel: 'Dia secondary speaker',
    toneTags: ['conversational', 'distinct', 'responsive'],
    useCases: ['Dialogue generation', 'Conversational AI', 'Podcast simulation', 'Interactive fiction'],
    genderPresentation: 'neutral',
    agePresentation: 'adult',
  },
  samples: [{
    id: `sample-${diaS2Id}`,
    text: 'Welcome back everyone. Today we have a special guest joining us to talk about voice technology.',
    audioUrl: `/audio/samples/${diaS2Id}.mp3`,
  }],
  variants: [{
    id: `variant-${diaS2Id}`,
    label: 'Dia 1.6B Speaker 2 (4-bit)',
    sourceType: 'open_model',
    sourceKey: 'mlx:dia:S2',
    supportsSsml: false,
  }],
  modelCard: {
    ...existingDia.modelCard,
    speakerTag: '[S2]',
  },
};

// New: Dia Dialogue (both speakers)
const diaDlgId = ulid();
{
  const audioSrc = '/tmp/dia-dialogue.mp3';
  if (existsSync(audioSrc)) {
    copyFileSync(audioSrc, `${AUDIO_DIR}/${diaDlgId}.mp3`);
    console.log(`  🔊 ${AUDIO_DIR}/${diaDlgId}.mp3`);
  }
  generateVoiceImage(diaDlgId, 'Dia Dialogue');
}

const diaDlg = {
  id: diaDlgId,
  name: 'Dia Dialogue',
  provider: 'Dia',
  providerId: 'dia',
  providerVoiceId: 'dialogue',
  description: 'Dia 1.6B multi-speaker dialogue mode — generates natural conversation between two distinct voices ([S1] and [S2]) in a single pass.',
  tags: ['mlx', 'local', 'open-source', 'dialogue', 'multi-speaker', 'generative', 'two-voice'],
  languages: ['en-US'],
  qualityTier: 'standard',
  licenseNotes: existingDia.licenseNotes,
  audioUrl: `/audio/samples/${diaDlgId}.mp3`,
  imageUrl: `/images/voices/${diaDlgId}.jpg`,
  metadata: {
    shortLabel: 'Two-voice dialogue',
    toneTags: ['conversational', 'interactive', 'natural'],
    useCases: ['Podcast generation', 'Interview simulation', 'Audiobook dialogue', 'Demo conversations'],
    genderPresentation: 'neutral',
    agePresentation: 'adult',
  },
  samples: [{
    id: `sample-${diaDlgId}`,
    text: '[S1] Hey, did you see the news today? [S2] Yeah, I couldn\'t believe it. That was quite a surprise!',
    audioUrl: `/audio/samples/${diaDlgId}.mp3`,
  }],
  variants: [{
    id: `variant-${diaDlgId}`,
    label: 'Dia 1.6B Dialogue (4-bit)',
    sourceType: 'open_model',
    sourceKey: 'mlx:dia:dialogue',
    supportsSsml: false,
  }],
  modelCard: {
    ...existingDia.modelCard,
    speakerTag: '[S1]/[S2]',
    isDialogueMode: true,
  },
};

console.log(`✅ Updated Dia to 3 entries (S1 updated, S2 + Dialogue new)`);

// ── 3. MARVIS: Add conversational_b, update existing ──
const marvisIdx = voices.findIndex(v => v.providerId === 'marvis');
const existingMarvis = voices[marvisIdx];

// Update existing to be explicitly conversational_a
existingMarvis.name = 'Marvis Conversational A';
existingMarvis.providerVoiceId = 'conversational_a';
existingMarvis.description = 'Marvis TTS 250M Conversational A — casual, natural speech style. Based on Sesame CSM architecture with streaming support.';
existingMarvis.metadata.shortLabel = 'Casual conversational';
existingMarvis.tags = [...new Set([...existingMarvis.tags, 'multi-voice', 'conversational'])];
if (existingMarvis.variants?.[0]) {
  existingMarvis.variants[0].sourceKey = 'marvis:250m-v0.2:conversational_a';
  existingMarvis.variants[0].label = 'Marvis 250M Conversational A (8-bit)';
}
if (existingMarvis.modelCard) {
  existingMarvis.modelCard.voicePreset = 'conversational_a';
  existingMarvis.modelCard.totalVoicePresets = 6;
  existingMarvis.modelCard.availablePresets = ['conversational_a', 'conversational_b', 'read_speech_a', 'read_speech_b', 'read_speech_c', 'read_speech_d'];
  existingMarvis.modelCard.voiceCloning = true;
  existingMarvis.modelCard.voiceCloningMethod = 'ref_audio';
  existingMarvis.modelCard.streamingSupport = true;
}

// Update audio if we have the explicit conversational_a sample
const marvisASrc = '/tmp/marvis-conversational-a.mp3';
if (existsSync(marvisASrc)) {
  copyFileSync(marvisASrc, `${AUDIO_DIR}/${existingMarvis.id}.mp3`);
  console.log(`  🔊 Updated Marvis A audio`);
}

// New: Marvis conversational_b
const marvisBId = ulid();
{
  const audioSrc = '/tmp/marvis-conversational-b.mp3';
  if (existsSync(audioSrc)) {
    copyFileSync(audioSrc, `${AUDIO_DIR}/${marvisBId}.mp3`);
    console.log(`  🔊 ${AUDIO_DIR}/${marvisBId}.mp3`);
  }
  generateVoiceImage(marvisBId, 'Marvis Conversational B');
}

const marvisB = {
  id: marvisBId,
  name: 'Marvis Conversational B',
  provider: 'Marvis',
  providerId: 'marvis',
  providerVoiceId: 'conversational_b',
  description: 'Marvis TTS 250M Conversational B — second conversational voice with distinct character. Different timbre and pacing from Conversational A.',
  tags: ['mlx', 'local', 'open-source', 'conversational', 'multi-voice', 'streaming'],
  languages: ['en-US'],
  qualityTier: 'standard',
  licenseNotes: existingMarvis.licenseNotes,
  audioUrl: `/audio/samples/${marvisBId}.mp3`,
  imageUrl: `/images/voices/${marvisBId}.jpg`,
  metadata: {
    shortLabel: 'Second conversational voice',
    toneTags: ['casual', 'animated', 'distinct'],
    useCases: ['Conversational AI', 'Multi-speaker demos', 'Prototyping', 'Creative dialogue'],
    genderPresentation: 'neutral',
    agePresentation: 'adult',
  },
  samples: [{
    id: `sample-${marvisBId}`,
    text: 'The morning sun cast long shadows across the quiet street, and somewhere in the distance a church bell rang.',
    audioUrl: `/audio/samples/${marvisBId}.mp3`,
  }],
  variants: [{
    id: `variant-${marvisBId}`,
    label: 'Marvis 250M Conversational B (8-bit)',
    sourceType: 'open_model',
    sourceKey: 'marvis:250m-v0.2:conversational_b',
    supportsSsml: false,
  }],
  modelCard: {
    ...existingMarvis.modelCard,
    voicePreset: 'conversational_b',
  },
};

console.log(`✅ Updated Marvis to 2 entries (A updated, B new)`);

// ── 4. Update metadata on all single-voice providers ──

// Soprano — truly single voice, voice param unused
const soprano = voices.find(v => v.providerId === 'soprano');
if (soprano) {
  soprano.description = 'Soprano 80M — lightweight single-voice TTS model. Fast inference, small footprint. Voice parameter exists in API but is unused in base model.';
  soprano.tags = [...new Set([...soprano.tags, 'single-voice', 'lightweight'])];
  if (soprano.modelCard) {
    soprano.modelCard.singleVoice = true;
    soprano.modelCard.voiceParameterNote = 'voice param exists in generate() but is explicitly unused (_ = voice)';
    soprano.modelCard.voiceCloning = false;
    soprano.modelCard.multiSpeaker = false;
  }
  console.log(`✅ Updated Soprano metadata (single-voice confirmed)`);
}

// Chatterbox — single default + voice cloning
const chatterbox = voices.find(v => v.providerId === 'chatterbox');
if (chatterbox) {
  chatterbox.description = 'Chatterbox Turbo — high-quality single-voice model with voice cloning via reference audio. Supports exaggeration and CFG weight controls for expressive output.';
  chatterbox.tags = [...new Set([...chatterbox.tags, 'voice-cloning', 'expressive'])];
  if (chatterbox.modelCard) {
    chatterbox.modelCard.singleVoice = true;
    chatterbox.modelCard.voiceCloning = true;
    chatterbox.modelCard.voiceCloningMethod = 'ref_audio (reference audio input)';
    chatterbox.modelCard.expressiveControls = ['exaggeration', 'cfg_weight', 'temperature'];
    chatterbox.modelCard.defaultVoiceNote = 'One built-in voice; additional voices require reference audio for cloning';
    chatterbox.modelCard.multiSpeaker = false;
  }
  console.log(`✅ Updated Chatterbox metadata (single voice + cloning)`);
}

// Spark TTS — single default + voice cloning + speed control
const spark = voices.find(v => v.providerId === 'spark-tts');
if (spark) {
  spark.description = 'Spark TTS 0.5B — Qwen2-based voice model with speed control and voice cloning via reference audio. Single default voice.';
  spark.tags = [...new Set([...spark.tags, 'voice-cloning', 'speed-control'])];
  if (spark.modelCard) {
    spark.modelCard.singleVoice = true;
    spark.modelCard.voiceCloning = true;
    spark.modelCard.voiceCloningMethod = 'ref_audio (reference audio input)';
    spark.modelCard.expressiveControls = ['speed', 'temperature'];
    spark.modelCard.defaultVoiceNote = 'One built-in voice; additional voices require reference audio for cloning';
    spark.modelCard.multiSpeaker = false;
  }
  console.log(`✅ Updated Spark TTS metadata (single voice + cloning + speed)`);
}

// Pocket TTS — has voice param + ref_audio cloning
const pocket = voices.find(v => v.providerId === 'pocket-tts');
if (pocket) {
  pocket.description = 'Pocket TTS 0.2B — ultra-compact voice model. Has voice parameter and reference audio cloning support, but ships with a single default voice.';
  pocket.tags = [...new Set([...pocket.tags, 'voice-cloning', 'ultra-compact'])];
  if (pocket.modelCard) {
    pocket.modelCard.singleVoice = true;
    pocket.modelCard.voiceCloning = true;
    pocket.modelCard.voiceCloningMethod = 'ref_audio + voice param';
    pocket.modelCard.defaultVoiceNote = 'voice parameter accepted but no built-in presets beyond default; reference audio enables cloning';
    pocket.modelCard.multiSpeaker = false;
  }
  console.log(`✅ Updated Pocket TTS metadata (single voice + cloning)`);
}

// OuteTTS — incomplete cache, likely single default
const outetts = voices.find(v => v.providerId === 'outetts');
if (outetts) {
  outetts.description = 'OuteTTS 1.0 1B — LLaMA-based open TTS model. Single default voice with potential for voice cloning (architecture supports it).';
  outetts.tags = [...new Set([...outetts.tags, 'llama-based'])];
  if (outetts.modelCard) {
    outetts.modelCard.singleVoice = true;
    outetts.modelCard.voiceCloning = false;
    outetts.modelCard.defaultVoiceNote = 'Single built-in voice; LLaMA architecture may support fine-tuning for additional voices';
    outetts.modelCard.multiSpeaker = false;
  }
  console.log(`✅ Updated OuteTTS metadata (single voice)`);
}

// VoxCPM — loading issues, keep as-is with note
const voxcpm = voices.find(v => v.providerId === 'voxcpm');
if (voxcpm) {
  voxcpm.description = 'VoxCPM 1.5 — Chinese-focused voice model with English support. Voice capabilities could not be fully verified due to weight loading issues in current mlx-audio version.';
  if (voxcpm.modelCard) {
    voxcpm.modelCard.verificationNote = 'Weight files not found in fp16 cache — model may need redownload or different quantization';
    voxcpm.modelCard.multiSpeaker = false;
  }
  console.log(`✅ Updated VoxCPM metadata (unverified capabilities)`);
}

// VibeVoice — voice param supports file-based voices + dialogue mode
const vibevoice = voices.find(v => v.providerId === 'vibevoice');
if (vibevoice) {
  vibevoice.description = 'VibeVoice Realtime 0.5B — supports voice loading from files and multi-speaker dialogue via voice+text list pairs. Single default voice without reference files.';
  vibevoice.tags = [...new Set([...vibevoice.tags, 'voice-loading', 'dialogue-capable'])];
  if (vibevoice.modelCard) {
    vibevoice.modelCard.singleVoice = true;
    vibevoice.modelCard.voiceCloning = true;
    vibevoice.modelCard.voiceCloningMethod = 'voice file path or list of (voice, text) tuples for multi-speaker';
    vibevoice.modelCard.dialogueCapable = true;
    vibevoice.modelCard.defaultVoiceNote = 'Default voice when no voice file provided; supports loading custom voice profiles from .wav/.npz files';
    vibevoice.modelCard.expressiveControls = ['cfg_scale', 'ddpm_steps'];
    vibevoice.modelCard.multiSpeaker = true;
  }
  console.log(`✅ Updated VibeVoice metadata (voice loading + dialogue)`);
}

// ── 5. Update existing Bark entries with expanded metadata ──
const barkSpeech = voices.find(v => v.providerId === 'bark' && v.name.includes('Speech'));
if (barkSpeech) {
  barkSpeech.tags = [...new Set([...barkSpeech.tags, 'multilingual', 'multi-preset'])];
  if (barkSpeech.modelCard) {
    barkSpeech.modelCard.totalPresets = 261;
    barkSpeech.modelCard.totalEnglishPresets = 10;
    barkSpeech.modelCard.supportedPresetLanguages = 13;
    barkSpeech.modelCard.presetNote = '261 built-in speaker presets across 13 languages (10 speakers × 13 languages + announcer). Each preset produces a distinct, consistent voice.';
  }
  console.log(`✅ Updated Bark (Speech) with preset counts`);
}

const barkSfx = voices.find(v => v.providerId === 'bark' && v.name.includes('Sound'));
if (barkSfx) {
  if (barkSfx.modelCard) {
    barkSfx.modelCard.totalPresets = 261;
    barkSfx.modelCard.presetNote = 'Sound effects use the same model — any voice preset can produce non-speech audio via special tokens.';
  }
  console.log(`✅ Updated Bark (Sound Effects) with preset info`);
}

// ── Assemble and write ──
const updatedVoices = [...voices, ...newBarkVoices, diaS2, diaDlg, marvisB];

writeFileSync(VOICES_PATH, JSON.stringify(updatedVoices, null, 2));
console.log(`\n📊 Total voices: ${updatedVoices.length} (was ${voices.length}, added ${updatedVoices.length - voices.length})`);
