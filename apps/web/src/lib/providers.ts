import type { ProviderDefinition } from '$lib/types';

export const DEFAULT_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'aws-polly',
    name: 'AWS Polly',
    type: 'cloud_provider',
    websiteUrl: 'https://aws.amazon.com/polly/'
  },
  {
    id: 'azure-speech',
    name: 'Azure Speech',
    type: 'cloud_provider',
    websiteUrl: 'https://azure.microsoft.com/products/ai-services/ai-speech'
  },
  {
    id: 'gcp-tts',
    name: 'Google Cloud TTS',
    type: 'cloud_provider',
    websiteUrl: 'https://cloud.google.com/text-to-speech'
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    type: 'cloud_provider',
    websiteUrl: 'https://elevenlabs.io'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'cloud_provider',
    websiteUrl: 'https://platform.openai.com/docs/guides/text-to-speech'
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    type: 'open_model',
    websiteUrl: 'https://huggingface.co'
  },
  {
    id: 'kokoro',
    name: 'Kokoro',
    type: 'open_model',
    websiteUrl: 'https://huggingface.co/hexgrad/Kokoro-82M'
  },
  {
    id: 'qwen3-tts',
    name: 'Qwen3 TTS',
    type: 'open_model',
    websiteUrl: 'https://huggingface.co/Qwen/Qwen3-TTS'
  }
];

export function normalizeProviderId(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
