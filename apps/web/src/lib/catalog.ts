import type { Voice } from './types';
import { normalizeVoiceLanguages } from './language-utils';

const CATALOG_JSON_URL = '/data/voices.json';

let catalogCache: Voice[] | null = null;

export async function loadCatalog(fetchFn: typeof fetch): Promise<Voice[]> {
  if (catalogCache) return catalogCache;

  const response = await fetchFn(CATALOG_JSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to load catalog from ${CATALOG_JSON_URL}`);
  }

  const payload = (await response.json()) as { voices: Voice[] };
  // Normalize language tags on every voice so that the rest of the app always
  // works with clean data regardless of how voices.json was produced.
  catalogCache = payload.voices.map(normalizeVoiceLanguages);
  return catalogCache;
}

export async function loadVoiceById(fetchFn: typeof fetch, voiceId: string): Promise<Voice | null> {
  const voices = await loadCatalog(fetchFn);
  return voices.find((voice) => voice.id === voiceId) ?? null;
}

/** Reset cache — useful for testing or HMR */
export function resetCatalogCache(): void {
  catalogCache = null;
}
