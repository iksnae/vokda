import type { Voice } from './types';

const CATALOG_JSON_URL = '/data/voices.json';

export async function loadCatalog(fetchFn: typeof fetch): Promise<Voice[]> {
  const response = await fetchFn(CATALOG_JSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to load catalog from ${CATALOG_JSON_URL}`);
  }

  const payload = (await response.json()) as { voices: Voice[] };
  return payload.voices;
}

export async function loadVoiceById(fetchFn: typeof fetch, voiceId: string): Promise<Voice | null> {
  const voices = await loadCatalog(fetchFn);
  return voices.find((voice) => voice.id === voiceId) ?? null;
}
