import { describe, it, expect } from 'vitest';
import { buildProviderCatalog, getProviderCatalogEntry } from './provider-catalog';
import type { Voice, ProviderDefinition } from '$lib/types';

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

const defs: ProviderDefinition[] = [
  { id: 'openai', name: 'OpenAI', type: 'cloud_provider', websiteUrl: 'https://openai.com' },
  { id: 'kokoro', name: 'Kokoro', type: 'open_model' },
];

const voices: Voice[] = [
  voice({ providerId: 'openai', languages: ['en-US'], qualityTier: 'premium', imageUrl: '/a.jpg', variants: [{ supportsSsml: true } as Voice['variants'][number]] }),
  voice({ providerId: 'openai', languages: ['es-ES'], qualityTier: 'standard', metadata: { genderPresentation: 'female' } as Voice['metadata'] }),
  voice({ providerId: 'kokoro', languages: ['en-US'] }),
];

describe('buildProviderCatalog', () => {
  it('counts voices per provider', () => {
    const cat = buildProviderCatalog(voices, defs);
    expect(cat.find((e) => e.id === 'openai')?.voiceCount).toBe(2);
    expect(cat.find((e) => e.id === 'kokoro')?.voiceCount).toBe(1);
  });

  it('aggregates distinct primary languages', () => {
    const openai = buildProviderCatalog(voices, defs).find((e) => e.id === 'openai');
    expect(openai?.languageCount).toBe(2);
    expect(openai?.languages).toEqual(expect.arrayContaining(['en-US', 'es-ES']));
  });

  it('reports SSML support only when a variant supports it', () => {
    const cat = buildProviderCatalog(voices, defs);
    expect(cat.find((e) => e.id === 'openai')?.ssmlSupport).toBe(true);
    expect(cat.find((e) => e.id === 'kokoro')?.ssmlSupport).toBe(false);
  });

  it('excludes providers that have no voices', () => {
    const cat = buildProviderCatalog(voices, [...defs, { id: 'empty', name: 'Empty', type: 'other' }]);
    expect(cat.find((e) => e.id === 'empty')).toBeUndefined();
  });

  it('picks a representative image and merges auth/pricing', () => {
    const cat = buildProviderCatalog(voices, defs, [
      { providerId: 'openai', authType: 'api_key', fields: [], pricingSummary: '$15/1M chars', freeTier: null, features: ['SSML'] },
    ]);
    const openai = cat.find((e) => e.id === 'openai');
    expect(openai?.sampleImageUrl).toBe('/a.jpg');
    expect(openai?.pricingSummary).toBe('$15/1M chars');
  });
});

describe('getProviderCatalogEntry', () => {
  it('returns the matching entry or undefined', () => {
    expect(getProviderCatalogEntry('openai', voices, defs)?.id).toBe('openai');
    expect(getProviderCatalogEntry('nope', voices, defs)).toBeUndefined();
  });
});
