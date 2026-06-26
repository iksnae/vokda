import { describe, it, expect } from 'vitest';
import { getProviderSteering } from './provider-steering';

const openaiVoice = { providerId: 'openai', providerVoiceId: 'verse' };

describe('getProviderSteering', () => {
  it('reports free-text instructions for OpenAI (gpt-4o-mini-tts)', () => {
    const s = getProviderSteering(openaiVoice);
    expect(s.kind).toBe('instructions');
    expect(s.label.length).toBeGreaterThan(0);
  });

  it('reports numeric settings for ElevenLabs', () => {
    const s = getProviderSteering({ providerId: 'elevenlabs' });
    expect(s.kind).toBe('settings');
    expect(s.settings?.some((x) => x.key === 'stability')).toBe(true);
    expect(s.settings?.some((x) => x.key === 'speed')).toBe(true);
  });

  it('enables ElevenLabs audio tags only for eleven_v3', () => {
    expect(getProviderSteering({ providerId: 'elevenlabs' }).audioTags).toBe(false);
    expect(getProviderSteering({ providerId: 'elevenlabs' }, 'eleven_multilingual_v2').audioTags).toBe(false);
    expect(getProviderSteering({ providerId: 'elevenlabs' }, 'eleven_v3').audioTags).toBe(true);
  });

  it('offers the newscaster style only for the 4 supported Polly voices', () => {
    const matthew = getProviderSteering({ providerId: 'aws-polly', providerVoiceId: 'Matthew' });
    expect(matthew.kind).toBe('styles');
    expect(matthew.options?.some((o) => o.id === 'newscaster')).toBe(true);

    // A Polly voice without newscaster support → no steering.
    expect(getProviderSteering({ providerId: 'aws-polly', providerVoiceId: 'Joey' }).kind).toBe('none');
    expect(getProviderSteering({ providerId: 'aws-polly' }).kind).toBe('none');
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
