/**
 * Per-voice / per-model voice steerability ("Direction").
 *
 * Describes what expressivity control a given voice supports so the audition UI
 * can render the right input and only send what the adapter actually honors.
 * Capability is resolved from the voice (and, for some providers, the model) —
 * not just the provider id — because support varies by voice (AWS Polly) and by
 * model (ElevenLabs).
 *
 * Kinds:
 *  - `instructions` — free-text direction (OpenAI gpt-4o-mini-tts).
 *  - `styles`       — a small enum of named styles (AWS Polly newscaster). [wired in a later slice]
 *  - `settings`     — numeric sliders (ElevenLabs voice_settings).          [wired in a later slice]
 *  - `none`         — no steering.
 *
 * See specs/feat-openai-refresh-and-steerability.md,
 * specs/feat-steerability-aws-polly.md, specs/feat-steerability-elevenlabs.md.
 */

export type SteeringKind = 'instructions' | 'styles' | 'settings' | 'none';

export interface SteeringOption {
  id: string;
  label: string;
}

export interface SteeringSetting {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ProviderSteering {
  kind: SteeringKind;
  label: string;
  /** instructions */
  placeholder?: string;
  /** styles */
  options?: SteeringOption[];
  /** settings */
  settings?: SteeringSetting[];
  /** ElevenLabs: inline audio tags supported by the selected model (eleven_v3). */
  audioTags?: boolean;
}

/** Minimal voice shape the resolver needs. */
export interface SteerableVoice {
  providerId?: string;
  providerVoiceId?: string;
}

const NONE: ProviderSteering = { kind: 'none', label: '' };

/**
 * Resolve the steering capability for a voice.
 * @param voice  the voice (providerId + providerVoiceId)
 * @param model  optional model override (used by providers whose capability is model-dependent)
 */
export function getProviderSteering(voice: SteerableVoice, _model?: string): ProviderSteering {
  switch (voice.providerId) {
    case 'openai':
      return {
        kind: 'instructions',
        label: 'Direction',
        placeholder: 'e.g. cheerful and upbeat; speak slowly and clearly',
      };
    default:
      return NONE;
  }
}
