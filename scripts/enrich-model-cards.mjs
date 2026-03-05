#!/usr/bin/env node
/**
 * Enrich voices.json with modelCard metadata for every voice.
 * Sources: provider docs, discovery data, HuggingFace model cards.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const VOICES_PATH = join(import.meta.dirname, '..', 'apps/web/static/data/voices.json');
const catalog = JSON.parse(readFileSync(VOICES_PATH, 'utf-8'));

// ─── Provider-level model card templates ─────────────────────

const PROVIDER_CARDS = {
  'aws-polly': {
    providerName: 'Amazon Web Services',
    providerType: 'cloud_api',
    providerUrl: 'https://aws.amazon.com/polly/',
    apiEndpoint: 'polly.{region}.amazonaws.com',
    modelFamily: 'Amazon Polly Neural',
    architecture: 'Neural TTS (NTTS)',
    sampleRate: 24000,
    bitDepth: 16,
    channels: 1,
    streamingSupport: true,
    ssmlSupport: true,
    wordTimestamps: true,
    multilingual: false,
    emotionControl: false,
    voiceCloning: false,
    maxInputLength: 3000,
    license: 'AWS Service Terms',
    licenseUrl: 'https://aws.amazon.com/service-terms/',
    commercialUse: true,
    attributionRequired: false,
    gdprCompliant: true,
    dataRetention: 'Not stored after synthesis',
    latencyMs: '~200-500',
    releaseDate: '2016-11-30',
    knownLimitations: [
      'Neural engine not available for all voices in all regions',
      'Some voices only support standard engine',
      'SSML tag support varies by engine type',
    ],
  },

  'azure-speech': {
    providerName: 'Microsoft Azure',
    providerType: 'cloud_api',
    providerUrl: 'https://azure.microsoft.com/products/ai-services/ai-speech',
    apiEndpoint: '{region}.tts.speech.microsoft.com',
    modelFamily: 'Azure Neural TTS',
    architecture: 'Neural TTS with style and role support',
    sampleRate: 48000,
    bitDepth: 16,
    channels: 1,
    streamingSupport: true,
    ssmlSupport: true,
    wordTimestamps: true,
    multilingual: true,
    emotionControl: true,
    voiceCloning: false,
    maxInputLength: 10000,
    license: 'Azure AI Services Terms',
    licenseUrl: 'https://www.microsoft.com/licensing/terms/welcome/welcomepage',
    commercialUse: true,
    attributionRequired: false,
    gdprCompliant: true,
    dataRetention: 'Not stored after synthesis',
    latencyMs: '~150-400',
    releaseDate: '2019-09-01',
    knownLimitations: [
      'Style support varies by voice',
      'Some voices are preview-only and may change',
      'Multilingual voices may have accent blending artifacts',
    ],
  },

  'gcp-tts': {
    providerName: 'Google Cloud',
    providerType: 'cloud_api',
    providerUrl: 'https://cloud.google.com/text-to-speech',
    apiEndpoint: 'texttospeech.googleapis.com',
    modelFamily: 'Google Cloud Text-to-Speech',
    sampleRate: 24000,
    bitDepth: 16,
    channels: 1,
    streamingSupport: true,
    ssmlSupport: true,
    wordTimestamps: true,
    multilingual: false,
    emotionControl: false,
    voiceCloning: false,
    maxInputLength: 5000,
    license: 'Google Cloud Terms of Service',
    licenseUrl: 'https://cloud.google.com/terms',
    commercialUse: true,
    attributionRequired: false,
    gdprCompliant: true,
    dataRetention: 'Not stored after synthesis',
    latencyMs: '~200-600',
    releaseDate: '2018-03-27',
    knownLimitations: [
      'Audio samples in this catalog used OpenAI fallback (GCP API key was invalid at generation time)',
      'Neural2 voices may not be available in all regions',
      'Studio voices have higher per-character cost',
    ],
  },

  openai: {
    providerName: 'OpenAI',
    providerType: 'cloud_api',
    providerUrl: 'https://platform.openai.com/docs/guides/text-to-speech',
    apiEndpoint: 'api.openai.com/v1/audio/speech',
    modelFamily: 'OpenAI TTS',
    architecture: 'Proprietary neural TTS',
    sampleRate: 24000,
    bitDepth: 16,
    channels: 1,
    streamingSupport: true,
    ssmlSupport: false,
    wordTimestamps: false,
    multilingual: true,
    emotionControl: false,
    voiceCloning: false,
    maxInputLength: 4096,
    license: 'OpenAI Usage Policies',
    licenseUrl: 'https://openai.com/policies/usage-policies',
    commercialUse: true,
    attributionRequired: false,
    dataRetention: 'Subject to OpenAI data usage policy',
    latencyMs: '~300-800',
    releaseDate: '2023-11-06',
    knownLimitations: [
      'No SSML support',
      'No word-level timestamps',
      'Voice selection is limited to preset voices',
      'ballad and verse voices not available on tts-1 model',
    ],
  },

  elevenlabs: {
    providerName: 'ElevenLabs',
    providerType: 'cloud_api',
    providerUrl: 'https://elevenlabs.io',
    apiEndpoint: 'api.elevenlabs.io/v1/text-to-speech',
    modelFamily: 'ElevenLabs Multilingual',
    architecture: 'Proprietary neural TTS with voice cloning',
    sampleRate: 44100,
    bitDepth: 16,
    channels: 1,
    streamingSupport: true,
    ssmlSupport: false,
    wordTimestamps: false,
    multilingual: true,
    emotionControl: true,
    voiceCloning: true,
    maxInputLength: 5000,
    license: 'ElevenLabs Terms of Service',
    licenseUrl: 'https://elevenlabs.io/terms',
    commercialUse: true,
    attributionRequired: false,
    dataRetention: 'Subject to plan and account settings',
    latencyMs: '~300-1000',
    releaseDate: '2023-01-01',
    knownLimitations: [
      'Rate limits vary by plan tier',
      'Voice cloning requires consent and verification',
      'Character quota depends on subscription plan',
    ],
  },

  kokoro: {
    providerName: 'Hexgrad (Kokoro)',
    providerType: 'local_mlx',
    providerUrl: 'https://huggingface.co/hexgrad/Kokoro-82M',
    modelUrl: 'https://huggingface.co/mlx-community/Kokoro-82M-bf16',
    modelFamily: 'Kokoro',
    modelName: 'Kokoro-82M',
    modelSize: '82M parameters',
    architecture: 'StyleTTS2-based with ISTFTNet vocoder',
    baseModel: 'Kokoro-82M',
    runtime: 'mlx-audio (Apple MLX)',
    quantization: 'bf16',
    diskSize: '~160MB',
    memoryRequired: '~300MB',
    hardwareRequirements: 'Apple Silicon (M1+)',
    sampleRate: 24000,
    channels: 1,
    streamingSupport: false,
    ssmlSupport: false,
    wordTimestamps: false,
    multilingual: true,
    emotionControl: false,
    voiceCloning: false,
    supportedLanguages: ['en-US', 'en-GB', 'es', 'fr', 'hi', 'it', 'ja', 'pt', 'zh'],
    maxInputLength: 5000,
    license: 'Apache 2.0',
    licenseUrl: 'https://huggingface.co/hexgrad/Kokoro-82M/blob/main/LICENSE',
    commercialUse: true,
    attributionRequired: false,
    realtimeFactor: '~50x realtime',
    latencyMs: '~200-1000',
    releaseDate: '2024-12-25',
    trainingData: 'Proprietary + public domain audiobooks',
    knownLimitations: [
      'Requires espeak-ng for phonemizer',
      'Some voice styles may sound similar',
      'Long texts may have prosody drift',
    ],
  },

  'qwen3-tts': {
    providerName: 'Alibaba Qwen',
    providerType: 'local_mlx',
    providerUrl: 'https://huggingface.co/Qwen/Qwen3-TTS',
    modelUrl: 'https://huggingface.co/mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-8bit',
    modelFamily: 'Qwen3-TTS',
    architecture: 'LLM-based codec language model + speech tokenizer',
    baseModel: 'Qwen3-1.7B',
    runtime: 'mlx-audio (Apple MLX)',
    quantization: '8-bit',
    diskSize: '~2.4GB',
    memoryRequired: '~3GB',
    hardwareRequirements: 'Apple Silicon (M1+, 8GB+ RAM)',
    sampleRate: 24000,
    channels: 1,
    streamingSupport: true,
    ssmlSupport: false,
    multilingual: true,
    emotionControl: false,
    voiceCloning: true,
    supportedLanguages: ['en', 'zh', 'de', 'it', 'pt', 'es', 'ja', 'ko', 'fr', 'ru'],
    maxInputLength: 5000,
    license: 'Apache 2.0',
    licenseUrl: 'https://huggingface.co/Qwen/Qwen3-TTS/blob/main/LICENSE',
    commercialUse: true,
    attributionRequired: false,
    realtimeFactor: '~10x realtime',
    latencyMs: '~1500-3000',
    releaseDate: '2025-05-22',
    paperUrl: 'https://arxiv.org/abs/2505.15311',
    knownLimitations: [
      'CustomVoice variant requires speaker name parameter',
      'Base variant has no built-in speaker presets',
      'Tokenizer regex warning (cosmetic, does not affect output)',
    ],
  },

  soprano: {
    providerName: 'SWivid',
    providerType: 'local_mlx',
    providerUrl: 'https://huggingface.co/SWivid/Soprano-80M',
    modelUrl: 'https://huggingface.co/mlx-community/Soprano-80M-bf16',
    modelFamily: 'Soprano',
    modelName: 'Soprano-80M',
    modelSize: '80M parameters',
    architecture: 'Lightweight TTS with flow matching',
    runtime: 'mlx-audio (Apple MLX)',
    quantization: 'bf16',
    diskSize: '~94MB',
    memoryRequired: '~200MB',
    hardwareRequirements: 'Apple Silicon (M1+)',
    sampleRate: 24000,
    channels: 1,
    streamingSupport: false,
    ssmlSupport: false,
    multilingual: false,
    emotionControl: false,
    voiceCloning: false,
    maxInputLength: 5000,
    license: 'MIT',
    commercialUse: true,
    attributionRequired: false,
    realtimeFactor: '~100x realtime',
    latencyMs: '~200-500',
    releaseDate: '2025-01-01',
    knownLimitations: [
      'Single voice only',
      'English only',
      'Ultra-light model trades some naturalness for speed',
    ],
  },

  chatterbox: {
    providerName: 'Resemble AI',
    providerType: 'local_mlx',
    providerUrl: 'https://huggingface.co/resemble-ai/chatterbox',
    modelUrl: 'https://huggingface.co/mlx-community/Chatterbox-Turbo-TTS-4bit',
    modelFamily: 'Chatterbox',
    modelName: 'Chatterbox-Turbo',
    modelSize: '368M parameters',
    architecture: 'RVQ-based codec language model',
    runtime: 'mlx-audio (Apple MLX)',
    quantization: '4-bit',
    diskSize: '~368MB',
    memoryRequired: '~500MB',
    hardwareRequirements: 'Apple Silicon (M1+)',
    sampleRate: 24000,
    channels: 1,
    streamingSupport: false,
    ssmlSupport: false,
    multilingual: false,
    emotionControl: true,
    voiceCloning: true,
    maxInputLength: 5000,
    license: 'MIT',
    licenseUrl: 'https://huggingface.co/resemble-ai/chatterbox/blob/main/LICENSE',
    commercialUse: true,
    attributionRequired: false,
    realtimeFactor: '~30x realtime',
    latencyMs: '~500-1000',
    releaseDate: '2025-06-12',
    knownLimitations: [
      'Voice cloning requires reference audio',
      'Default voice only without reference',
      'Emotion control via text prompt engineering',
    ],
  },

  dia: {
    providerName: 'Nari Labs',
    providerType: 'local_mlx',
    providerUrl: 'https://huggingface.co/nari-labs/Dia-1.6B',
    modelUrl: 'https://huggingface.co/mlx-community/Dia-1.6B',
    modelFamily: 'Dia',
    modelName: 'Dia-1.6B',
    modelSize: '1.6B parameters',
    architecture: 'Encoder-decoder with DAC audio codec',
    runtime: 'mlx-audio (Apple MLX)',
    quantization: 'bf16',
    diskSize: '~3.2GB',
    memoryRequired: '~4GB',
    hardwareRequirements: 'Apple Silicon (M1+, 8GB+ RAM)',
    sampleRate: 24000,
    channels: 1,
    streamingSupport: false,
    ssmlSupport: false,
    multilingual: false,
    emotionControl: true,
    voiceCloning: false,
    maxInputLength: 5000,
    license: 'Apache 2.0',
    licenseUrl: 'https://huggingface.co/nari-labs/Dia-1.6B/blob/main/LICENSE',
    commercialUse: true,
    attributionRequired: false,
    realtimeFactor: '~5x realtime',
    latencyMs: '~5000-12000',
    releaseDate: '2025-03-24',
    knownLimitations: [
      'Primarily a dialogue model — best for conversational text',
      'Supports nonverbal cues like (laughs), (sighs)',
      'Multi-speaker via [S1] [S2] tags in text',
      'Slower than single-speaker models',
    ],
  },

  outetts: {
    providerName: 'OuteAI',
    providerType: 'local_mlx',
    providerUrl: 'https://huggingface.co/OuteAI/Llama-OuteTTS-1.0-1B',
    modelUrl: 'https://huggingface.co/mlx-community/Llama-OuteTTS-1.0-1B-8bit',
    modelFamily: 'OuteTTS',
    modelName: 'Llama-OuteTTS-1.0-1B',
    modelSize: '1B parameters',
    architecture: 'Llama backbone with WavTokenizer',
    baseModel: 'Llama-3.2-1B',
    runtime: 'mlx-audio (Apple MLX)',
    quantization: '8-bit',
    diskSize: '~351MB',
    memoryRequired: '~600MB',
    hardwareRequirements: 'Apple Silicon (M1+)',
    sampleRate: 24000,
    channels: 1,
    streamingSupport: false,
    ssmlSupport: false,
    multilingual: true,
    emotionControl: false,
    voiceCloning: true,
    supportedLanguages: ['en', 'zh', 'ja', 'ko'],
    maxInputLength: 5000,
    license: 'CC-BY-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    commercialUse: true,
    attributionRequired: true,
    realtimeFactor: '~5x realtime',
    latencyMs: '~3000-8000',
    releaseDate: '2025-02-28',
    knownLimitations: [
      'Slower generation than smaller models',
      'Voice cloning requires reference audio input',
      'Attribution required under CC-BY-4.0',
    ],
  },

  'pocket-tts': {
    providerName: 'ShoukanLabs',
    providerType: 'local_mlx',
    providerUrl: 'https://huggingface.co/ShoukanLabs/pocket-tts',
    modelUrl: 'https://huggingface.co/mlx-community/pocket-tts',
    modelFamily: 'Pocket TTS',
    modelName: 'Pocket TTS',
    modelSize: '~50M parameters',
    architecture: 'Compact neural TTS for edge devices',
    runtime: 'mlx-audio (Apple MLX)',
    quantization: 'bf16',
    diskSize: '~100MB',
    memoryRequired: '~150MB',
    hardwareRequirements: 'Apple Silicon (M1+)',
    sampleRate: 24000,
    channels: 1,
    streamingSupport: false,
    ssmlSupport: false,
    multilingual: false,
    emotionControl: false,
    voiceCloning: false,
    maxInputLength: 5000,
    license: 'Apache 2.0',
    commercialUse: true,
    attributionRequired: false,
    realtimeFactor: '~200x realtime',
    latencyMs: '~100-300',
    releaseDate: '2025-04-01',
    knownLimitations: [
      'Single voice only',
      'English only',
      'Optimized for short utterances',
    ],
  },

  'spark-tts': {
    providerName: 'SparkAudio',
    providerType: 'local_mlx',
    providerUrl: 'https://huggingface.co/SparkAudio/Spark-TTS-0.5B',
    modelUrl: 'https://huggingface.co/mlx-community/Spark-TTS-0.5B-bf16',
    modelFamily: 'Spark TTS',
    modelName: 'Spark-TTS-0.5B',
    modelSize: '500M parameters',
    architecture: 'Qwen2 backbone with BiCodec speech tokenizer',
    baseModel: 'Qwen2-0.5B',
    runtime: 'mlx-audio (Apple MLX)',
    quantization: 'bf16',
    diskSize: '~1GB',
    memoryRequired: '~1.2GB',
    hardwareRequirements: 'Apple Silicon (M1+)',
    sampleRate: 16000,
    channels: 1,
    streamingSupport: false,
    ssmlSupport: false,
    multilingual: true,
    emotionControl: false,
    voiceCloning: true,
    supportedLanguages: ['en', 'zh'],
    maxInputLength: 5000,
    license: 'Apache 2.0',
    licenseUrl: 'https://huggingface.co/SparkAudio/Spark-TTS-0.5B/blob/main/LICENSE',
    commercialUse: true,
    attributionRequired: false,
    realtimeFactor: '~15x realtime',
    latencyMs: '~1000-2000',
    releaseDate: '2025-03-13',
    paperUrl: 'https://arxiv.org/abs/2503.01710',
    knownLimitations: [
      'Zero-shot cloning requires reference audio',
      'Default voice without reference',
      'Chinese and English only',
    ],
  },

  voxcpm: {
    providerName: 'OpenBMB',
    providerType: 'local_mlx',
    providerUrl: 'https://huggingface.co/openbmb/VoxCPM1.5',
    modelUrl: 'https://huggingface.co/mlx-community/VoxCPM1.5-8bit',
    modelFamily: 'VoxCPM',
    modelName: 'VoxCPM-1.5',
    modelSize: '~900M parameters',
    architecture: 'CPM-based bilingual speech model',
    runtime: 'mlx-audio (Apple MLX)',
    quantization: '8-bit',
    diskSize: '~900MB',
    memoryRequired: '~1.2GB',
    hardwareRequirements: 'Apple Silicon (M1+)',
    sampleRate: 24000,
    channels: 1,
    streamingSupport: false,
    ssmlSupport: false,
    multilingual: true,
    emotionControl: false,
    voiceCloning: false,
    supportedLanguages: ['zh', 'en'],
    maxInputLength: 5000,
    license: 'Apache 2.0',
    commercialUse: true,
    attributionRequired: false,
    realtimeFactor: '~20x realtime',
    latencyMs: '~800-1500',
    releaseDate: '2025-04-01',
    knownLimitations: [
      'Primarily trained on Chinese, English is secondary',
      'Single voice only',
      'May have Chinese-accented English prosody',
    ],
  },
};

// ─── Voice-specific overrides (Azure styles, Polly engines, etc) ─

function getAzureVoiceCard(voice) {
  const card = { ...PROVIDER_CARDS['azure-speech'] };
  // Parse style info from description
  const styleMatch = voice.description?.match(/Styles?:\s*(.+?)\.?$/i);
  if (styleMatch) {
    card.supportedStyles = styleMatch[1].split(',').map(s => s.trim());
  }
  // Architecture detail
  const name = voice.providerVoiceId || voice.name;
  if (name.includes('Multilingual')) {
    card.architecture = 'Neural TTS — multilingual adaptive';
    card.multilingual = true;
  }
  return card;
}

function getPollyVoiceCard(voice) {
  const card = { ...PROVIDER_CARDS['aws-polly'] };
  card.modelVersion = 'Neural engine';
  return card;
}

function getGcpVoiceCard(voice) {
  const card = { ...PROVIDER_CARDS['gcp-tts'] };
  const name = voice.providerVoiceId || voice.name;
  if (name.includes('Neural2')) card.architecture = 'Neural2 (2nd generation neural TTS)';
  else if (name.includes('Studio')) card.architecture = 'Studio (highest quality, limited voices)';
  else if (name.includes('Journey')) card.architecture = 'Journey (conversational, long-form)';
  else if (name.includes('News')) card.architecture = 'News (broadcast-optimized neural TTS)';
  else if (name.includes('Wavenet')) card.architecture = 'WaveNet (DeepMind neural vocoder)';
  return card;
}

function getOpenAIVoiceCard(voice) {
  const card = { ...PROVIDER_CARDS['openai'] };
  card.modelName = 'tts-1';
  card.modelVersion = 'tts-1';
  return card;
}

function getElevenLabsVoiceCard(voice) {
  const card = { ...PROVIDER_CARDS['elevenlabs'] };
  card.modelName = 'eleven_multilingual_v2';
  return card;
}

function getKokoroVoiceCard(voice) {
  const card = { ...PROVIDER_CARDS['kokoro'] };
  const vk = voice.providerVoiceId || '';
  if (vk.startsWith('af_') || vk.startsWith('am_')) {
    card.supportedLanguages = ['en-US'];
  } else if (vk.startsWith('bf_') || vk.startsWith('bm_')) {
    card.supportedLanguages = ['en-GB'];
  }
  return card;
}

// ─── Apply model cards ───────────────────────────────────────

let enriched = 0;

for (const voice of catalog.voices) {
  const pid = voice.providerId || '';

  let card;

  switch (pid) {
    case 'aws-polly': card = getPollyVoiceCard(voice); break;
    case 'azure-speech': card = getAzureVoiceCard(voice); break;
    case 'gcp-tts': card = getGcpVoiceCard(voice); break;
    case 'openai': card = getOpenAIVoiceCard(voice); break;
    case 'elevenlabs': card = getElevenLabsVoiceCard(voice); break;
    case 'kokoro': card = getKokoroVoiceCard(voice); break;
    case 'qwen3-tts':
    case 'soprano':
    case 'chatterbox':
    case 'dia':
    case 'outetts':
    case 'pocket-tts':
    case 'spark-tts':
    case 'voxcpm':
      card = { ...PROVIDER_CARDS[pid] };
      break;
    default:
      continue;
  }

  if (card) {
    voice.modelCard = card;
    enriched++;
  }
}

writeFileSync(VOICES_PATH, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Enriched ${enriched}/${catalog.voices.length} voices with modelCard data`);
