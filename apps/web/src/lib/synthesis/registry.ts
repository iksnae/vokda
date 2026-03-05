import type { SynthesisAdapter } from './types';
import type { VoiceVariant } from '$lib/types';
import { awsPollyAdapter } from './adapters/aws-polly';
import { azureSpeechAdapter } from './adapters/azure-speech';
import { gcpTtsAdapter } from './adapters/gcp-tts';
import { elevenLabsAdapter } from './adapters/elevenlabs';
import { huggingFaceAdapter } from './adapters/hf';
import { selfHostedAdapter } from './adapters/self-hosted';

const adapters: SynthesisAdapter[] = [
  awsPollyAdapter,
  azureSpeechAdapter,
  gcpTtsAdapter,
  elevenLabsAdapter,
  huggingFaceAdapter,
  selfHostedAdapter
];

export function resolveAdapter(variant: VoiceVariant): SynthesisAdapter | null {
  return adapters.find((adapter) => adapter.canHandle(variant)) ?? null;
}

export { adapters };
