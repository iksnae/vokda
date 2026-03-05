import type { Voice, VoiceVariant } from '$lib/types';

export type PreviewInputMode = 'text' | 'ssml';

export type SynthesisRequest = {
  voice: Voice;
  variant: VoiceVariant;
  input: string;
  mode: PreviewInputMode;
};

export type SynthesisPreview = {
  provider: string;
  adapter: string;
  variantId: string;
  sourceKey: string;
  inputUsed: string;
  warnings: string[];
  audioUrl?: string;
  latencyMs: number;
  generatedAt: string;
};

export interface SynthesisAdapter {
  id: string;
  canHandle: (variant: VoiceVariant) => boolean;
  synthesizePreview: (request: SynthesisRequest) => Promise<SynthesisPreview>;
}
