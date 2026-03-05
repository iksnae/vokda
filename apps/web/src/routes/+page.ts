import { loadCatalog } from '$lib/catalog';

export async function load({ fetch }: { fetch: typeof globalThis.fetch }) {
  const voices = await loadCatalog(fetch);
  return { voices };
}
