import { describe, it, expect } from 'vitest';
import { getProviderColor } from './provider-colors';

describe('Provider color mapping', () => {
  it('returns orange tones for AWS Polly', () => {
    const color = getProviderColor('aws-polly');
    expect(color.bg).toBeTruthy();
    expect(color.border).toBeTruthy();
    expect(color.text).toBeTruthy();
  });

  it('returns blue tones for Azure Speech', () => {
    const color = getProviderColor('azure-speech');
    expect(color.bg).toBeTruthy();
  });

  it('returns green tones for Google Cloud TTS', () => {
    const color = getProviderColor('gcp-tts');
    expect(color.bg).toBeTruthy();
  });

  it('returns purple tones for ElevenLabs', () => {
    const color = getProviderColor('elevenlabs');
    expect(color.bg).toBeTruthy();
  });

  it('returns yellow tones for Hugging Face', () => {
    const color = getProviderColor('huggingface');
    expect(color.bg).toBeTruthy();
  });

  it('returns dark tones for OpenAI', () => {
    const color = getProviderColor('openai');
    expect(color.bg).toBeTruthy();
  });

  it('returns neutral for unknown providers', () => {
    const color = getProviderColor('unknown-provider');
    expect(color.bg).toBeTruthy();
  });

  it('normalizes provider name input', () => {
    const color1 = getProviderColor('AWS Polly');
    const color2 = getProviderColor('aws-polly');
    expect(color1.bg).toBe(color2.bg);
  });
});
