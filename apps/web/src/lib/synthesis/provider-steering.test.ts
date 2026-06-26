import { describe, it, expect } from 'vitest';
import { getProviderSteering } from './provider-steering';

const openaiVoice = { providerId: 'openai', providerVoiceId: 'verse' };

describe('getProviderSteering', () => {
  it('reports free-text instructions for OpenAI (gpt-4o-mini-tts)', () => {
    const s = getProviderSteering(openaiVoice);
    expect(s.kind).toBe('instructions');
    expect(s.label.length).toBeGreaterThan(0);
  });

  it('reports no steering for providers not yet wired', () => {
    expect(getProviderSteering({ providerId: 'cartesia' }).kind).toBe('none');
    expect(getProviderSteering({ providerId: 'gcp-tts' }).kind).toBe('none');
  });

  it('defaults to none for unknown / missing providers', () => {
    expect(getProviderSteering({ providerId: 'does-not-exist' }).kind).toBe('none');
    expect(getProviderSteering({}).kind).toBe('none');
  });
});
