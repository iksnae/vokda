/**
 * Unit tests for lib/language-utils.ts
 *
 * Covers every public function with representative cases drawn directly from
 * the catalog's actual provider patterns.
 */

import { describe, it, expect } from 'vitest';
import {
  isMultilingualCapable,
  getPrimaryLanguage,
  getLanguageDisplayName,
  getAccentLabel,
  normalizeVoiceLanguages,
  buildLanguageOptions,
  buildAccentOptions,
  voiceMatchesLanguage,
  voiceMatchesAccent,
} from './language-utils';
import type { Voice } from './types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeVoice(overrides: Partial<Voice> & { languages: string[] }): Voice {
  return {
    id: 'test-id',
    name: 'Test Voice',
    provider: 'Test Provider',
    description: '',
    tags: [],
    qualityTier: 'standard',
    licenseNotes: '',
    metadata: {
      shortLabel: '',
      searchDescription: '',
      machineTags: [],
      useCases: [],
      toneTags: [],
      audienceTags: [],
      metadataQuality: 'sparse',
    },
    samples: [],
    variants: [],
    ...overrides,
  };
}

// Provider-representative voice fixtures

/** Simple single-locale voice (most providers) */
const voiceSimpleEnUS = makeVoice({ id: 'v-en-us', languages: ['en-US'] });

/** Deepgram-style: bare base + sub-locale pair */
const voiceDeepgramEnGB = makeVoice({ id: 'v-en-gb', languages: ['en', 'en-GB'] });
const voiceDeepgramItIT = makeVoice({ id: 'v-it', languages: ['it', 'it-IT'] });
const voiceDeepgramDeDE = makeVoice({ id: 'v-de', languages: ['de', 'de-DE'] });
const voiceDeepgramEsAR = makeVoice({ id: 'v-es', languages: ['es', 'es-AR'] });

/** Gemini-style: multilingual model, many base codes */
const geminiLanguages = [
  'en-US', 'ar', 'fil', 'bn', 'fi', 'nl', 'gl', 'en',
  'ka', 'fr', 'el', 'de', 'gu', 'hi', 'ht', 'id', 'he', 'it', 'hu', 'ja', 'is',
];
const voiceGemini = makeVoice({
  id: 'v-gemini',
  languages: geminiLanguages,
  modelCard: { providerName: 'Google', providerType: 'cloud_api', multilingual: true },
});

/** Edge TTS multilingual: 9 diverse languages, no modelCard flag */
const voiceEdgeMultilingual = makeVoice({
  id: 'v-edge',
  languages: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN', 'ko-KR'],
});

/** Bark: 13 diverse languages, no modelCard flag */
const voiceBark = makeVoice({
  id: 'v-bark',
  languages: [
    'en-US', 'zh-CN', 'fr-FR', 'de-DE', 'hi-IN',
    'it-IT', 'ja-JP', 'ko-KR', 'pl-PL', 'pt-BR', 'ru-RU', 'es-ES', 'tr-TR',
  ],
});

/** Voice with explicit primaryLanguage override */
const voiceWithOverride = makeVoice({
  id: 'v-override',
  languages: ['en-US', 'fr-FR'],
  primaryLanguage: 'fr-FR',
});

/** Single bare-base voice (no sub-locale, e.g. a Deepgram voice with only "en") */
const voiceBareEnOnly = makeVoice({ id: 'v-en-bare', languages: ['en'] });

// ─── isMultilingualCapable ────────────────────────────────────────────────────

describe('isMultilingualCapable', () => {
  it('returns true when modelCard.multilingual is true', () => {
    expect(isMultilingualCapable(voiceGemini)).toBe(true);
  });

  it('returns true for Edge TTS multilingual via heuristic (9 distinct bases)', () => {
    expect(isMultilingualCapable(voiceEdgeMultilingual)).toBe(true);
  });

  it('returns true for Bark via heuristic (13 distinct bases)', () => {
    expect(isMultilingualCapable(voiceBark)).toBe(true);
  });

  it('returns false for a simple single-locale voice', () => {
    expect(isMultilingualCapable(voiceSimpleEnUS)).toBe(false);
  });

  it('returns false for a Deepgram base+sub-locale pair (2 entries, 1 base)', () => {
    expect(isMultilingualCapable(voiceDeepgramItIT)).toBe(false);
  });

  it('returns false for a voice with 3 distinct bases (at threshold)', () => {
    const voice = makeVoice({ languages: ['en-US', 'fr-FR', 'de-DE'] });
    expect(isMultilingualCapable(voice)).toBe(false);
  });

  it('returns true for a voice with exactly 4 distinct bases (just above threshold)', () => {
    const voice = makeVoice({ languages: ['en-US', 'fr-FR', 'de-DE', 'ja-JP'] });
    expect(isMultilingualCapable(voice)).toBe(true);
  });

  it('returns false for a voice with no languages', () => {
    const voice = makeVoice({ languages: [] });
    expect(isMultilingualCapable(voice)).toBe(false);
  });
});

// ─── getPrimaryLanguage ───────────────────────────────────────────────────────

describe('getPrimaryLanguage', () => {
  it('returns primaryLanguage field when explicitly set', () => {
    expect(getPrimaryLanguage(voiceWithOverride)).toBe('fr-FR');
  });

  it('returns the single locale for a simple voice', () => {
    expect(getPrimaryLanguage(voiceSimpleEnUS)).toBe('en-US');
  });

  it('returns languages[0] for a multilingual-capable voice (Gemini)', () => {
    expect(getPrimaryLanguage(voiceGemini)).toBe('en-US');
  });

  it('returns languages[0] for Edge TTS multilingual', () => {
    expect(getPrimaryLanguage(voiceEdgeMultilingual)).toBe('en-US');
  });

  it('returns the sub-locale for Deepgram en+en-GB pattern', () => {
    expect(getPrimaryLanguage(voiceDeepgramEnGB)).toBe('en-GB');
  });

  it('returns the sub-locale for Deepgram it+it-IT pattern', () => {
    expect(getPrimaryLanguage(voiceDeepgramItIT)).toBe('it-IT');
  });

  it('returns the sub-locale for Deepgram de+de-DE pattern', () => {
    expect(getPrimaryLanguage(voiceDeepgramDeDE)).toBe('de-DE');
  });

  it('returns the sub-locale for Deepgram es+es-AR pattern', () => {
    expect(getPrimaryLanguage(voiceDeepgramEsAR)).toBe('es-AR');
  });

  it('returns "en" for a voice with no languages', () => {
    const voice = makeVoice({ languages: [] });
    expect(getPrimaryLanguage(voice)).toBe('en');
  });

  it('returns the bare code for a voice with only a bare base tag', () => {
    expect(getPrimaryLanguage(voiceBareEnOnly)).toBe('en');
  });

  it('is not confused by a sub-locale for a different base', () => {
    // languages[0] = 'fr', there's 'de-DE' but NOT 'fr-FR'
    const voice = makeVoice({ languages: ['fr', 'de-DE'] });
    // 'de-DE' starts with 'de', not 'fr', so no specific locale found for 'fr'
    expect(getPrimaryLanguage(voice)).toBe('fr');
  });
});

// ─── getLanguageDisplayName ───────────────────────────────────────────────────

describe('getLanguageDisplayName', () => {
  it('resolves common language codes', () => {
    expect(getLanguageDisplayName('en')).toBe('English');
    expect(getLanguageDisplayName('de')).toBe('German');
    expect(getLanguageDisplayName('ja')).toBe('Japanese');
    expect(getLanguageDisplayName('fr')).toBe('French');
    expect(getLanguageDisplayName('es')).toBe('Spanish');
  });

  it('resolves less-common language codes used in the catalog', () => {
    expect(getLanguageDisplayName('fil')).toBe('Filipino');
    expect(getLanguageDisplayName('ht')).toBe('Haitian Creole');
    expect(getLanguageDisplayName('gl')).toBe('Galician');
    expect(getLanguageDisplayName('ka')).toBe('Georgian');
    expect(getLanguageDisplayName('gu')).toBe('Gujarati');
  });

  it('falls back to the raw code for an unrecognized tag', () => {
    // 'xyz' is not a valid BCP-47 tag; Intl returns undefined, we return the input
    expect(getLanguageDisplayName('xyz')).toBe('xyz');
  });
});

// ─── getAccentLabel ───────────────────────────────────────────────────────────

describe('getAccentLabel', () => {
  // Pattern A: adjectival form — strip trailing " {baseName}"
  it('strips language name from adjectival locale names', () => {
    expect(getAccentLabel('en-US')).toBe('American');
    expect(getAccentLabel('en-GB')).toBe('British');
    expect(getAccentLabel('en-AU')).toBe('Australian');
    expect(getAccentLabel('en-CA')).toBe('Canadian');
    expect(getAccentLabel('fr-CA')).toBe('Canadian');
    expect(getAccentLabel('es-MX')).toBe('Mexican');
    expect(getAccentLabel('pt-BR')).toBe('Brazilian');
    expect(getAccentLabel('es-419')).toBe('Latin American');
  });

  // Pattern B: parenthetical form — extract region name
  it('extracts the parenthetical for non-adjectival locales', () => {
    const india = getAccentLabel('en-IN');
    const ireland = getAccentLabel('en-IE');
    const nz = getAccentLabel('en-NZ');
    // The exact string comes from Intl — we just verify it's not a raw code
    expect(india).not.toBe('en-IN');
    expect(ireland).not.toBe('en-IE');
    expect(nz).not.toBe('en-NZ');
    expect(india.length).toBeGreaterThan(1);
    expect(ireland.length).toBeGreaterThan(1);
    expect(nz.length).toBeGreaterThan(1);
  });

  it('returns the language name for a bare base code (no region)', () => {
    expect(getAccentLabel('en')).toBe('English');
    expect(getAccentLabel('de')).toBe('German');
  });
});

// ─── normalizeVoiceLanguages ──────────────────────────────────────────────────

describe('normalizeVoiceLanguages', () => {
  it('removes bare base code when a sub-locale exists for the same base', () => {
    const result = normalizeVoiceLanguages(voiceDeepgramItIT);
    expect(result.languages).toEqual(['it-IT']);
  });

  it('removes bare base for Deepgram en+en-GB pattern', () => {
    const result = normalizeVoiceLanguages(voiceDeepgramEnGB);
    expect(result.languages).toEqual(['en-GB']);
  });

  it('removes bare base for de+de-DE pattern', () => {
    const result = normalizeVoiceLanguages(voiceDeepgramDeDE);
    expect(result.languages).toEqual(['de-DE']);
  });

  it('leaves a single-locale voice unchanged', () => {
    const result = normalizeVoiceLanguages(voiceSimpleEnUS);
    expect(result.languages).toEqual(['en-US']);
    expect(result).toBe(voiceSimpleEnUS); // same reference — no allocation
  });

  it('leaves a bare-only voice unchanged', () => {
    const result = normalizeVoiceLanguages(voiceBareEnOnly);
    expect(result.languages).toEqual(['en']);
    expect(result).toBe(voiceBareEnOnly);
  });

  it('leaves multilingual-capable voices unchanged (all locales are distinct)', () => {
    const result = normalizeVoiceLanguages(voiceEdgeMultilingual);
    expect(result.languages).toEqual(voiceEdgeMultilingual.languages);
  });

  it('removes bare "en" from Gemini voice since "en-US" is already present', () => {
    // Gemini has both "en-US" and "en" in its list — "en" is redundant
    const result = normalizeVoiceLanguages(voiceGemini);
    expect(result.languages).not.toContain('en');
    expect(result.languages).toContain('en-US');
    // All other non-English locales are untouched (no sub-locales for ar, fil, etc.)
    expect(result.languages).toContain('ar');
    expect(result.languages).toContain('fil');
    expect(result.languages).toContain('de');
  });

  it('does not mutate the original voice object', () => {
    const originalLangs = [...voiceDeepgramItIT.languages];
    normalizeVoiceLanguages(voiceDeepgramItIT);
    expect(voiceDeepgramItIT.languages).toEqual(originalLangs);
  });

  it('returns the same object reference when nothing changes', () => {
    const voice = makeVoice({ languages: ['en-US', 'fr-FR'] }); // two distinct sub-locales
    const result = normalizeVoiceLanguages(voice);
    expect(result).toBe(voice);
  });

  it('handles multiple languages each with their own sub-locale', () => {
    // e.g. a hypothetical voice with ["en", "en-US", "fr", "fr-FR"]
    const voice = makeVoice({ languages: ['en', 'en-US', 'fr', 'fr-FR'] });
    const result = normalizeVoiceLanguages(voice);
    expect(result.languages).toEqual(['en-US', 'fr-FR']);
  });
});

// ─── buildLanguageOptions ─────────────────────────────────────────────────────

describe('buildLanguageOptions', () => {
  const catalog = [
    makeVoice({ id: '1', languages: ['en-US'] }),
    makeVoice({ id: '2', languages: ['en-US'] }),
    makeVoice({ id: '3', languages: ['en-GB'] }),
    makeVoice({ id: '4', languages: ['de', 'de-DE'] }),      // Deepgram-style
    makeVoice({ id: '5', languages: ['it', 'it-IT'] }),
    makeVoice({ id: '6', languages: geminiLanguages, modelCard: { providerName: 'G', providerType: 'cloud_api', multilingual: true } }),
  ];

  it('groups by base language code of primary language', () => {
    const opts = buildLanguageOptions(catalog);
    const bases = opts.map((o) => o.base);
    expect(bases).toContain('en');
    expect(bases).toContain('de');
    expect(bases).toContain('it');
  });

  it('counts each voice exactly once', () => {
    const opts = buildLanguageOptions(catalog);
    const en = opts.find((o) => o.base === 'en');
    // voices 1, 2 (en-US), 3 (en-GB), 6 (Gemini → en-US primary) = 4
    expect(en?.count).toBe(4);
  });

  it('does not double-count a Deepgram base+sub-locale voice', () => {
    const opts = buildLanguageOptions(catalog);
    const de = opts.find((o) => o.base === 'de');
    expect(de?.count).toBe(1);
  });

  it('sorts by count descending', () => {
    const opts = buildLanguageOptions(catalog);
    for (let i = 1; i < opts.length; i++) {
      expect(opts[i - 1].count).toBeGreaterThanOrEqual(opts[i].count);
    }
  });

  it('provides human-readable display names', () => {
    const opts = buildLanguageOptions(catalog);
    const en = opts.find((o) => o.base === 'en');
    const de = opts.find((o) => o.base === 'de');
    expect(en?.displayName).toBe('English');
    expect(de?.displayName).toBe('German');
  });

  it('returns an empty array for an empty catalog', () => {
    expect(buildLanguageOptions([])).toEqual([]);
  });
});

// ─── buildAccentOptions ───────────────────────────────────────────────────────

describe('buildAccentOptions', () => {
  const englishCatalog = [
    makeVoice({ id: '1', languages: ['en-US'] }),
    makeVoice({ id: '2', languages: ['en-US'] }),
    makeVoice({ id: '3', languages: ['en-GB'] }),
    makeVoice({ id: '4', languages: ['en-AU'] }),
  ];

  it('returns accent options when multiple locales exist for the selected language', () => {
    const opts = buildAccentOptions(englishCatalog, new Set(['en']));
    expect(opts.length).toBeGreaterThan(1);
    const locales = opts.map((o) => o.locale);
    expect(locales).toContain('en-US');
    expect(locales).toContain('en-GB');
    expect(locales).toContain('en-AU');
  });

  it('counts voices per locale correctly', () => {
    const opts = buildAccentOptions(englishCatalog, new Set(['en']));
    const us = opts.find((o) => o.locale === 'en-US');
    expect(us?.count).toBe(2);
  });

  it('sorts by count descending', () => {
    const opts = buildAccentOptions(englishCatalog, new Set(['en']));
    for (let i = 1; i < opts.length; i++) {
      expect(opts[i - 1].count).toBeGreaterThanOrEqual(opts[i].count);
    }
  });

  it('returns [] when no bases are selected', () => {
    const opts = buildAccentOptions(englishCatalog, new Set());
    expect(opts).toEqual([]);
  });

  it('returns [] when only a single locale exists (no accent choice to offer)', () => {
    const germanCatalog = [
      makeVoice({ id: 'g1', languages: ['de', 'de-DE'] }),
      makeVoice({ id: 'g2', languages: ['de', 'de-DE'] }),
    ];
    const opts = buildAccentOptions(germanCatalog, new Set(['de']));
    expect(opts).toEqual([]);
  });

  it('only returns accents for the selected base languages', () => {
    const mixedCatalog = [
      ...englishCatalog,
      makeVoice({ id: 'g1', languages: ['de', 'de-DE'] }),
    ];
    // Only English selected
    const opts = buildAccentOptions(mixedCatalog, new Set(['en']));
    const bases = opts.map((o) => o.base);
    expect(bases.every((b) => b === 'en')).toBe(true);
  });

  it('omits voices with no region subtag from accent options', () => {
    const catalog = [
      makeVoice({ id: '1', languages: ['en-US'] }),
      makeVoice({ id: '2', languages: ['en'] }), // bare, no region
    ];
    const opts = buildAccentOptions(catalog, new Set(['en']));
    // Only 1 distinct sub-locale (en-US) → returns []
    expect(opts).toEqual([]);
  });
});

// ─── voiceMatchesLanguage ─────────────────────────────────────────────────────

describe('voiceMatchesLanguage', () => {
  it('matches when the voice base is in the selected set', () => {
    expect(voiceMatchesLanguage(voiceSimpleEnUS, new Set(['en']))).toBe(true);
  });

  it('does not match when the voice base is not in the selected set', () => {
    expect(voiceMatchesLanguage(voiceSimpleEnUS, new Set(['de']))).toBe(false);
  });

  it('matches all voices when selected set is empty', () => {
    expect(voiceMatchesLanguage(voiceSimpleEnUS, new Set())).toBe(true);
    expect(voiceMatchesLanguage(voiceDeepgramItIT, new Set())).toBe(true);
  });

  it('correctly routes a Deepgram it+it-IT voice to Italian base', () => {
    expect(voiceMatchesLanguage(voiceDeepgramItIT, new Set(['it']))).toBe(true);
    expect(voiceMatchesLanguage(voiceDeepgramItIT, new Set(['en']))).toBe(false);
  });

  it('routes a Gemini voice to English (en) despite 21 language tags', () => {
    expect(voiceMatchesLanguage(voiceGemini, new Set(['en']))).toBe(true);
    expect(voiceMatchesLanguage(voiceGemini, new Set(['de']))).toBe(false);
  });
});

// ─── voiceMatchesAccent ───────────────────────────────────────────────────────

describe('voiceMatchesAccent', () => {
  it('matches when the primary locale is in the selected set', () => {
    expect(voiceMatchesAccent(voiceSimpleEnUS, new Set(['en-US']))).toBe(true);
  });

  it('does not match when the primary locale is not in the selected set', () => {
    expect(voiceMatchesAccent(voiceSimpleEnUS, new Set(['en-GB']))).toBe(false);
  });

  it('matches all voices when selected set is empty', () => {
    expect(voiceMatchesAccent(voiceSimpleEnUS, new Set())).toBe(true);
  });

  it('matches a Deepgram voice by its derived primary locale (en-GB)', () => {
    expect(voiceMatchesAccent(voiceDeepgramEnGB, new Set(['en-GB']))).toBe(true);
    expect(voiceMatchesAccent(voiceDeepgramEnGB, new Set(['en-US']))).toBe(false);
  });
});
