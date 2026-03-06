/**
 * Language utilities for the voice catalog filter system.
 *
 * Design principles:
 * - Zero hardcoded language name maps. All display names are resolved via the
 *   standard `Intl.DisplayNames` API, which covers every valid BCP-47 tag
 *   including any locale a future provider might introduce.
 * - No hardcoded provider lists. Multilingual-capability is detected from
 *   existing `modelCard` data and a language-diversity heuristic.
 * - No hardcoded "multi-region language" lists. Accent sub-filter availability
 *   is derived purely from the catalog data at runtime.
 * - `primaryLanguage` on Voice is an optional curator override. The algorithm
 *   works correctly without it for every current and anticipated voice format.
 *
 * Language filter semantics:
 *   Tier 1 — Language: groups voices by primary language identity (what the
 *             voice IS, not what it can produce).
 *   Tier 2 — Accent/Region: narrows within a language to a specific locale.
 *             Only surfaces when the selected language has multiple distinct
 *             regional locales in the catalog.
 */

import type { Voice } from './types';

// ─── Intl instances (module-level singletons, safe to reuse) ───────────────

let _langNames: Intl.DisplayNames | null = null;

function langNames(): Intl.DisplayNames {
  if (!_langNames) {
    _langNames = new Intl.DisplayNames(['en'], { type: 'language' });
  }
  return _langNames;
}

// ─── Public types ──────────────────────────────────────────────────────────

/** A Tier-1 language option for the filter panel. */
export type LanguageOption = {
  /** BCP-47 base language code: 'en', 'de', 'ja'. */
  base: string;
  /** Human-readable display name: 'English', 'German', 'Japanese'. */
  displayName: string;
  /** Number of voices whose primary language maps to this base. */
  count: number;
};

/** A Tier-2 accent / region option, shown only when a parent language is selected. */
export type AccentOption = {
  /** Full BCP-47 locale: 'en-US', 'en-GB', 'es-MX'. */
  locale: string;
  /**
   * Short accent label derived from the locale via Intl.DisplayNames.
   * Examples: 'American', 'British', 'Mexican', 'India', 'New Zealand'.
   */
  label: string;
  /** Base language code this option belongs to: 'en', 'es'. */
  base: string;
  /** Number of voices whose primary language is exactly this locale. */
  count: number;
};

// ─── Core derivation functions ─────────────────────────────────────────────

/**
 * Returns true if this voice is a multilingual-capable model whose `languages`
 * array describes synthesis *capability* rather than language *identity*.
 *
 * Detection is data-driven — no hardcoded provider names:
 *   1. `voice.modelCard.multilingual === true` (explicit flag).
 *   2. The voice has more than 3 distinct base-language codes in `languages`
 *      (heuristic: regional variants max at 2 bases; multilingual models
 *      typically expose 9–21; threshold of 4 has zero false positives on the
 *      current catalog and leaves headroom for edge cases).
 */
export function isMultilingualCapable(voice: Voice): boolean {
  if (voice.modelCard?.multilingual === true) return true;

  const distinctBases = new Set(
    (voice.languages ?? []).map((l) => l.split('-')[0])
  );
  return distinctBases.size > 3;
}

/**
 * Returns the BCP-47 locale that represents this voice's language *identity*.
 *
 * Resolution order:
 *   1. `voice.primaryLanguage` when set (explicit curator override).
 *   2. `voice.languages[0]` for multilingual-capable models (convention:
 *      the identity locale is always listed first).
 *   3. The most specific locale for the first language's base when the array
 *      contains both a bare base code and a sub-locale for the same language
 *      (e.g. ["it", "it-IT"] → "it-IT"; ["en", "en-GB"] → "en-GB").
 *   4. `voice.languages[0]` as the final fallback.
 *
 * Never throws — returns 'en' for a voice with no language data.
 */
export function getPrimaryLanguage(voice: Voice): string {
  if (voice.primaryLanguage) return voice.primaryLanguage;

  const langs = voice.languages ?? [];
  if (langs.length === 0) return 'en';
  if (langs.length === 1) return langs[0];

  // For multilingual-capable models the first tag is the identity locale
  if (isMultilingualCapable(voice)) return langs[0];

  // Prefer the most-specific locale for the first language's base code.
  // Handles providers that tag both the bare base and a region sub-locale.
  const base0 = langs[0].split('-')[0];
  const moreSpecific = langs.find((l) => l.startsWith(base0 + '-'));
  return moreSpecific ?? langs[0];
}

/**
 * Returns the human-readable display name for a BCP-47 base language code.
 *
 * Uses Intl.DisplayNames — no hardcoded map, handles any valid locale.
 * Falls back to the raw code if the API cannot resolve it.
 *
 * @example
 *   getLanguageDisplayName('en')  → "English"
 *   getLanguageDisplayName('fil') → "Filipino"
 *   getLanguageDisplayName('ht')  → "Haitian Creole"
 */
export function getLanguageDisplayName(base: string): string {
  try {
    return langNames().of(base) ?? base;
  } catch {
    return base;
  }
}

/**
 * Returns a short accent / region label for a BCP-47 sub-locale.
 * For bare base codes (no region subtag) returns the full language name.
 *
 * The label is derived algorithmically from Intl.DisplayNames — no map:
 *
 *   Pattern A — adjectival form:  "American English"  → "American"
 *                                 "Brazilian Portuguese" → "Brazilian"
 *   Pattern B — parenthetical:   "English (India)"   → "India"
 *                                 "English (New Zealand)" → "New Zealand"
 *   Fallback — full locale name returned as-is.
 *
 * @example
 *   getAccentLabel('en-US')  → "American"
 *   getAccentLabel('en-GB')  → "British"
 *   getAccentLabel('en-IN')  → "India"
 *   getAccentLabel('es-MX')  → "Mexican"
 *   getAccentLabel('fr-CA')  → "Canadian"
 *   getAccentLabel('es-419') → "Latin American"
 */
export function getAccentLabel(locale: string): string {
  const parts = locale.split('-');

  // Bare base code — return the language name directly
  if (parts.length < 2) {
    return getLanguageDisplayName(locale);
  }

  let fullName: string;
  let baseName: string;

  try {
    fullName = langNames().of(locale) ?? locale;
    baseName = langNames().of(parts[0]) ?? parts[0];
  } catch {
    return locale;
  }

  // Pattern A: "American English" → strip trailing " {baseName}"
  if (fullName.endsWith(' ' + baseName)) {
    return fullName.slice(0, -(baseName.length + 1));
  }

  // Pattern B: "English (India)" → extract parenthetical
  const parenMatch = fullName.match(/\(([^)]+)\)$/);
  if (parenMatch) {
    return parenMatch[1];
  }

  // Fallback
  return fullName;
}

// ─── Catalog normalization ─────────────────────────────────────────────────

/**
 * Returns a normalized copy of a voice, removing redundant bare base-language
 * codes from `voice.languages` when a more specific sub-locale already covers
 * that base.
 *
 * This is a pure function — the original voice object is never mutated.
 *
 * Rule: if `languages` contains both "xx" and "xx-YY" (same base, different
 * specificity), the bare "xx" is redundant and is removed. "xx-YY" is the
 * authoritative tag.
 *
 * @example
 *   ["it", "it-IT"]        → ["it-IT"]
 *   ["de", "de-DE"]        → ["de-DE"]
 *   ["en", "en-GB"]        → ["en-GB"]
 *   ["en"]                 → ["en"]          (no sub-locale, kept as-is)
 *   ["en-US"]              → ["en-US"]       (unchanged)
 *   ["en-US", "es-ES", …]  → ["en-US", "es-ES", …]   (multilingual, unchanged)
 */
export function normalizeVoiceLanguages(voice: Voice): Voice {
  const langs = voice.languages ?? [];
  if (langs.length <= 1) return voice;

  // Build the set of base codes that have at least one sub-locale present
  const basesWithSubLocale = new Set<string>();
  for (const lang of langs) {
    if (lang.includes('-')) {
      basesWithSubLocale.add(lang.split('-')[0]);
    }
  }

  // Nothing to remove if no sub-locales exist
  if (basesWithSubLocale.size === 0) return voice;

  const normalized = langs.filter((lang) => {
    // Keep all sub-locales (they contain the region info)
    if (lang.includes('-')) return true;
    // Remove bare base codes when a sub-locale covers the same base
    return !basesWithSubLocale.has(lang);
  });

  // Avoid creating a new object if nothing changed
  if (normalized.length === langs.length) return voice;

  return { ...voice, languages: normalized };
}

// ─── Filter option builders ────────────────────────────────────────────────

/**
 * Builds the Tier-1 language filter options from a voice catalog.
 *
 * Groups voices by the base language code of their primary language.
 * Each voice is counted exactly once regardless of how many locales it lists.
 * Returns options sorted by voice count descending, then by display name.
 */
export function buildLanguageOptions(voices: Voice[]): LanguageOption[] {
  // Map of base code → Set of voice IDs (deduplication)
  const baseToVoiceIds = new Map<string, Set<string>>();

  for (const voice of voices) {
    const primary = getPrimaryLanguage(voice);
    const base = primary.split('-')[0];

    if (!baseToVoiceIds.has(base)) {
      baseToVoiceIds.set(base, new Set());
    }
    baseToVoiceIds.get(base)!.add(voice.id);
  }

  return Array.from(baseToVoiceIds.entries())
    .map(([base, voiceIds]) => ({
      base,
      displayName: getLanguageDisplayName(base),
      count: voiceIds.size
    }))
    .sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName));
}

/**
 * Builds the Tier-2 accent / region filter options for the currently selected
 * base languages.
 *
 * Returns an empty array when:
 *   - No language bases are selected.
 *   - The selected language(s) only have a single distinct primary locale
 *     (e.g. German catalog only has "de-DE" → no accent choice to offer).
 *
 * This means the accent section auto-appears and auto-hides based purely on
 * what the catalog contains — no hardcoded list of "multi-region languages".
 */
export function buildAccentOptions(
  voices: Voice[],
  selectedBases: Set<string>
): AccentOption[] {
  if (selectedBases.size === 0) return [];

  // Map of locale → Set of voice IDs
  const localeToVoiceIds = new Map<string, Set<string>>();

  for (const voice of voices) {
    const primary = getPrimaryLanguage(voice);
    const base = primary.split('-')[0];

    if (!selectedBases.has(base)) continue;

    // Only offer accent drill-down for sub-locales (those that carry region info)
    if (!primary.includes('-')) continue;

    if (!localeToVoiceIds.has(primary)) {
      localeToVoiceIds.set(primary, new Set());
    }
    localeToVoiceIds.get(primary)!.add(voice.id);
  }

  // Suppress accent tier when there is only a single locale (no choice to offer)
  if (localeToVoiceIds.size <= 1) return [];

  return Array.from(localeToVoiceIds.entries())
    .map(([locale, voiceIds]) => ({
      locale,
      label: getAccentLabel(locale),
      base: locale.split('-')[0],
      count: voiceIds.size
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// ─── Filter predicates ─────────────────────────────────────────────────────

/**
 * Returns true if this voice's primary language base is in `selectedBases`.
 * Pass an empty set to match all voices.
 */
export function voiceMatchesLanguage(
  voice: Voice,
  selectedBases: Set<string>
): boolean {
  if (selectedBases.size === 0) return true;
  const base = getPrimaryLanguage(voice).split('-')[0];
  return selectedBases.has(base);
}

/**
 * Returns true if this voice's primary language locale is in `selectedLocales`.
 * Pass an empty set to match all voices.
 *
 * Intended to be applied only after `voiceMatchesLanguage` has already
 * narrowed the result set to the correct language group.
 */
export function voiceMatchesAccent(
  voice: Voice,
  selectedLocales: Set<string>
): boolean {
  if (selectedLocales.size === 0) return true;
  return selectedLocales.has(getPrimaryLanguage(voice));
}
