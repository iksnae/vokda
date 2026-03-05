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
