import type { Voice, VoiceVariant, Waveform } from '$lib/types';

export type PreviewInputMode = 'text' | 'ssml';

export type SynthesisRequest = {
  voice: Voice;
  variant: VoiceVariant;
  input: string;
  mode: PreviewInputMode;
  /** Free-text delivery direction (provider steerability, e.g. OpenAI instructions). */
  instructions?: string;
  /** Numeric expressivity settings (e.g. ElevenLabs voice_settings: stability, style, speed). */
  settings?: Record<string, number>;
  /** Named style (e.g. AWS Polly "newscaster"). */
  style?: string;
  /** Model override (e.g. ElevenLabs eleven_v3 for audio tags). */
  model?: string;
};

export type SynthesisPreview = {
  provider: string;
  adapter: string;
  variantId: string;
  sourceKey: string;
  inputUsed: string;
  warnings: string[];
  audioUrl?: string;
  waveform?: Waveform | null;
  latencyMs: number;
  generatedAt: string;
};

export interface SynthesisAdapter {
  id: string;
  canHandle: (variant: VoiceVariant) => boolean;
  synthesizePreview: (request: SynthesisRequest) => Promise<SynthesisPreview>;
}
