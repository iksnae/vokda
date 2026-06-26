import { describe, it, expect } from 'vitest';
import { findSimilarVoices } from './similar-voices';
import type { Voice } from '$lib/types';

function voice(p: Partial<Voice>): Voice {
  return {
    id: 'v',
    name: 'V',
    provider: 'P',
    providerId: 'p',
    description: '',
    tags: [],
    languages: ['en-US'],
    qualityTier: 'standard',
    licenseNotes: '',
    metadata: {} as Voice['metadata'],
    variants: [],
    ...p,
  } as Voice;
}

const target = voice({
  id: 'target',
  languages: ['en-US'],
  qualityTier: 'premium',
  tags: ['warm', 'narration'],
  metadata: { genderPresentation: 'female', agePresentation: 'adult' } as Voice['metadata'],
});

describe('findSimilarVoices', () => {
  it('never includes the target itself', () => {
    const catalog = [target, voice({ id: 'a' })];
    expect(findSimilarVoices(target, catalog).some((v) => v.id === 'target')).toBe(false);
  });

  it('ranks a same-language same-gender voice above an unrelated one', () => {
    const close = voice({ id: 'close', languages: ['en-US'], metadata: { genderPresentation: 'female' } as Voice['metadata'], tags: ['warm'] });
    const far = voice({ id: 'far', languages: ['ja-JP'], metadata: { genderPresentation: 'male' } as Voice['metadata'], tags: [] });
    const result = findSimilarVoices(target, [far, close]);
    expect(result[0].id).toBe('close');
  });

  it('respects the limit', () => {
    const catalog = Array.from({ length: 20 }, (_, i) => voice({ id: `v${i}`, languages: ['en-US'] }));
    expect(findSimilarVoices(target, catalog, 5)).toHaveLength(5);
  });

  it('returns an empty array when there are no other voices', () => {
    expect(findSimilarVoices(target, [target])).toEqual([]);
  });
});
