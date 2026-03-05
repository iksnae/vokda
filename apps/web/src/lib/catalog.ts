import type { Voice } from './types';

const FALLBACK_URL = '/catalog/voices.json';

export async function loadCatalog(fetchFn: typeof fetch): Promise<Voice[]> {
  const remoteUrl = import.meta.env.PUBLIC_CATALOG_INDEX_URL as string | undefined;
  const url = remoteUrl && remoteUrl.trim().length > 0 ? remoteUrl : FALLBACK_URL;

  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Failed to load catalog index from ${url}`);
  }

  const payload = (await res.json()) as { voices: Voice[] };
  return payload.voices;
}
