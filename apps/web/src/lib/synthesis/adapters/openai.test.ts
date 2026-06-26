import { describe, it, expect } from 'vitest';
import { extractVoiceId, resolveOpenAIModel, OPENAI_DEFAULT_MODEL } from './openai';

describe('OpenAI adapter — voice id extraction', () => {
  it('extracts the voice from a "tts" sourceKey', () => {
    expect(extractVoiceId('openai:tts:alloy')).toBe('alloy');
  });

  it('extracts the voice from a "voice" sourceKey, including new voices', () => {
    expect(extractVoiceId('openai:voice:marin')).toBe('marin');
    expect(extractVoiceId('openai:tts:cedar')).toBe('cedar');
  });

  it('falls back to alloy for a malformed sourceKey', () => {
    expect(extractVoiceId('')).toBe('alloy');
  });
});

describe('OpenAI adapter — model resolution', () => {
  it('uses gpt-4o-mini-tts for every voice — no per-voice substring heuristic', () => {
    // The old code returned tts-1 for most voices and only switched to
    // gpt-4o-mini-tts when the sourceKey contained "ballad"/"verse". The model
    // must not depend on the voice name: gpt-4o-mini-tts renders all voices.
    expect(resolveOpenAIModel()).toBe('gpt-4o-mini-tts');
    expect(OPENAI_DEFAULT_MODEL).toBe('gpt-4o-mini-tts');
  });
});
