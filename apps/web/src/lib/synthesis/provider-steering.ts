/**
 * Per-provider voice steerability ("Direction").
 *
 * Describes what expressivity control a provider supports so the audition UI
 * can render the right input and only send what the adapter actually honors.
 *
 * Currently only OpenAI's free-text `instructions` (gpt-4o-mini-tts) is wired
 * end-to-end. AWS Polly (SSML speaking styles) and ElevenLabs (voice settings)
 * are intentionally `none` here until their adapter mappings land — the UI must
 * not offer a control we don't actually apply. See
 * specs/feat-openai-refresh-and-steerability.md.
 */

export type SteeringKind = 'instructions' | 'none';

export interface ProviderSteering {
  kind: SteeringKind;
  label: string;
  placeholder?: string;
}

const STEERING: Record<string, ProviderSteering> = {
  openai: {
    kind: 'instructions',
    label: 'Direction',
    placeholder: 'e.g. cheerful and upbeat; speak slowly and clearly',
  },
};

export function getProviderSteering(providerId: string): ProviderSteering {
  return STEERING[providerId] ?? { kind: 'none', label: '' };
}
