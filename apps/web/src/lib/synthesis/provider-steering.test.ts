import { describe, it, expect } from 'vitest';
import { getProviderSteering } from './provider-steering';

describe('getProviderSteering', () => {
  it('reports free-text instructions for OpenAI (gpt-4o-mini-tts)', () => {
    const s = getProviderSteering('openai');
    expect(s.kind).toBe('instructions');
    expect(s.label.length).toBeGreaterThan(0);
  });

  it('reports no steering for providers not yet wired', () => {
    // Polly (SSML styles) and ElevenLabs (voice settings) are honest follow-ups —
    // the UI must not offer a control we don't actually send.
    expect(getProviderSteering('aws-polly').kind).toBe('none');
    expect(getProviderSteering('elevenlabs').kind).toBe('none');
  });

  it('defaults to none for unknown providers', () => {
    expect(getProviderSteering('does-not-exist').kind).toBe('none');
  });
});
