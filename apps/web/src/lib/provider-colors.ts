import { normalizeProviderId } from './providers';

export type ProviderColorScheme = {
  bg: string;
  border: string;
  text: string;
};

const colorMap: Record<string, ProviderColorScheme> = {
  'aws-polly': {
    bg: '#fff4e6',
    border: '#f0c68a',
    text: '#8f5a0b'
  },
  'azure-speech': {
    bg: '#e8f0fe',
    border: '#a4c0e8',
    text: '#1a4f8b'
  },
  'gcp-tts': {
    bg: '#e6f4ea',
    border: '#93d1a0',
    text: '#1a6b3a'
  },
  elevenlabs: {
    bg: '#f3e8ff',
    border: '#c4a0e8',
    text: '#5b2d8e'
  },
  huggingface: {
    bg: '#fef9e7',
    border: '#f0d86e',
    text: '#7a6411'
  },
  openai: {
    bg: '#f0f0f0',
    border: '#b0b0b0',
    text: '#333333'
  },
  kokoro: {
    bg: '#fce4ec',
    border: '#f48fb1',
    text: '#880e4f'
  },
  'qwen3-tts': {
    bg: '#e0f7fa',
    border: '#80deea',
    text: '#006064'
  },
  soprano: {
    bg: '#f3e5f5',
    border: '#ce93d8',
    text: '#6a1b9a'
  },
  chatterbox: {
    bg: '#e8eaf6',
    border: '#9fa8da',
    text: '#283593'
  },
  dia: {
    bg: '#fff3e0',
    border: '#ffcc80',
    text: '#e65100'
  },
  outetts: {
    bg: '#e0f2f1',
    border: '#80cbc4',
    text: '#004d40'
  },
  'pocket-tts': {
    bg: '#fce4ec',
    border: '#f48fb1',
    text: '#880e4f'
  },
  'spark-tts': {
    bg: '#fff8e1',
    border: '#ffe082',
    text: '#f57f17'
  },
  voxcpm: {
    bg: '#e8f5e9',
    border: '#a5d6a7',
    text: '#2e7d32'
  }
};

const neutralColor: ProviderColorScheme = {
  bg: '#f2f6f9',
  border: '#d0dce6',
  text: '#3e5871'
};

/**
 * Returns a color scheme for a given provider ID or display name.
 * Falls back to neutral tones for unknown providers.
 */
export function getProviderColor(providerIdOrName: string): ProviderColorScheme {
  const normalized = normalizeProviderId(providerIdOrName);
  return colorMap[normalized] ?? neutralColor;
}
