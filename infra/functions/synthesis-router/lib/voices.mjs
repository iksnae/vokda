/**
 * Voice catalog for the GET /v1/voices endpoint.
 *
 * Loads voices.json from the data directory (copied at build time)
 * and provides filtering and lookup utilities.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getVoiceSteering } from './steering.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Host that actually serves the catalog's static assets (audio samples,
 * images). The /v1/voices API is served from api.vokda.iksnae.com, but those
 * assets live only on the apex, so site-relative paths must be absolutized to
 * this host or consumers resolve them against the API host and 404. Mirrors
 * BASE_URL in scripts/publish-catalog.mjs. See issue #11.
 */
export const CATALOG_BASE_URL = 'https://vokda.iksnae.com';

/**
 * Absolutize a catalog asset URL to the apex host. Site-relative paths
 * ("/audio/...") are prefixed with CATALOG_BASE_URL; already-absolute URLs
 * (http(s):// or protocol-relative //) are returned unchanged. Empty/missing
 * values become null.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function absolutizeCatalogUrl(url) {
  if (!url) return null;
  return url.startsWith('/') && !url.startsWith('//') ? `${CATALOG_BASE_URL}${url}` : url;
}

let _voices = null;

/**
 * Lazily load and cache the voice catalog.
 * @returns {object[]}
 */
function loadVoices() {
  if (_voices) return _voices;
  const path = resolve(__dirname, '..', 'data', 'voices.json');
  const raw = readFileSync(path, 'utf-8');
  const parsed = JSON.parse(raw);
  _voices = parsed.voices || parsed;
  return _voices;
}

/**
 * Get voices filtered to enabled providers only.
 * Supports query-string filters: provider, language, gender, quality, search, limit, offset.
 *
 * @param {Set<string>} enabledProviderIds - provider IDs with active credentials
 * @param {object} [filters]
 * @param {string} [filters.provider] - filter by providerId
 * @param {string} [filters.language] - filter by language code prefix (e.g. "en", "en-US")
 * @param {string} [filters.gender] - filter by gender presentation (male, female, neutral)
 * @param {string} [filters.quality] - filter by qualityTier (premium, standard)
 * @param {string} [filters.search] - search name, description, tags
 * @param {number} [filters.limit=100] - max results (capped at 500)
 * @param {number} [filters.offset=0] - pagination offset
 * @returns {{ voices: object[], total: number, limit: number, offset: number }}
 */
export function queryVoices(enabledProviderIds, filters = {}) {
  const all = loadVoices();
  let results = all.filter(v => enabledProviderIds.has(v.providerId));

  // Apply filters
  if (filters.provider) {
    results = results.filter(v => v.providerId === filters.provider);
  }

  if (filters.language) {
    const lang = filters.language.toLowerCase();
    results = results.filter(v =>
      v.languages?.some(l => l.toLowerCase().startsWith(lang))
    );
  }

  if (filters.gender) {
    const g = filters.gender.toLowerCase();
    results = results.filter(v =>
      v.metadata?.genderPresentation?.toLowerCase() === g
    );
  }

  if (filters.quality) {
    results = results.filter(v => v.qualityTier === filters.quality);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(v => {
      const name = (v.name || '').toLowerCase();
      const desc = (v.description || '').toLowerCase();
      const tags = (v.tags || []).join(' ').toLowerCase();
      const provider = (v.provider || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || tags.includes(q) || provider.includes(q);
    });
  }

  const total = results.length;
  const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
  const offset = Math.max(Number(filters.offset) || 0, 0);

  results = results.slice(offset, offset + limit);

  // Slim down voice objects for the list response
  const voices = results.map(formatVoiceSummary);

  return { voices, total, limit, offset };
}

/**
 * Get a single voice by ID, only if it belongs to an enabled provider.
 * @param {Set<string>} enabledProviderIds
 * @param {string} voiceId
 * @returns {object|null}
 */
export function getVoiceById(enabledProviderIds, voiceId) {
  const all = loadVoices();
  const voice = all.find(v => v.id === voiceId);
  if (!voice) return null;
  if (!enabledProviderIds.has(voice.providerId)) return null;
  return formatVoiceDetail(voice);
}

/**
 * Summary format for list endpoint — omits heavy fields.
 */
function formatVoiceSummary(v) {
  return {
    id: v.id,
    name: v.name,
    provider: v.provider,
    providerId: v.providerId,
    providerVoiceId: v.providerVoiceId,
    description: v.description,
    languages: v.languages || [],
    gender: v.metadata?.genderPresentation || null,
    age: v.metadata?.agePresentation || null,
    qualityTier: v.qualityTier || null,
    tags: v.tags || [],
    toneTags: v.metadata?.toneTags || [],
    audioUrl: absolutizeCatalogUrl(v.audioUrl),
    ssmlSupport: v.variants?.[0]?.supportsSsml || false,
    steering: getVoiceSteering(v),
  };
}

/**
 * Full detail format for single-voice endpoint.
 */
function formatVoiceDetail(v) {
  return {
    id: v.id,
    name: v.name,
    provider: v.provider,
    providerId: v.providerId,
    providerVoiceId: v.providerVoiceId,
    description: v.description,
    languages: v.languages || [],
    gender: v.metadata?.genderPresentation || null,
    age: v.metadata?.agePresentation || null,
    qualityTier: v.qualityTier || null,
    tags: v.tags || [],
    toneTags: v.metadata?.toneTags || [],
    audioUrl: absolutizeCatalogUrl(v.audioUrl),
    imageUrl: absolutizeCatalogUrl(v.imageUrl),
    ssmlSupport: v.variants?.[0]?.supportsSsml || false,
    steering: getVoiceSteering(v),
    licenseNotes: v.licenseNotes || null,
    metadata: v.metadata || {},
    modelCard: v.modelCard || {},
    samples: (v.samples || []).map(s => ({
      id: s.id,
      label: s.label,
      audioUrl: absolutizeCatalogUrl(s.audioUrl),
      transcript: s.transcript,
    })),
    variants: (v.variants || []).map(vr => ({
      id: vr.id,
      sourceKey: vr.sourceKey,
      sourceType: vr.sourceType,
      runnable: vr.runnable,
      supportsSsml: vr.supportsSsml || false,
      outputFormats: vr.outputFormats || [],
      maxInputChars: vr.maxInputChars || null,
    })),
  };
}
