import { loadCatalog } from '$lib/catalog';

export async function load({ fetch }) {
  const voices = await loadCatalog(fetch);
  return { voices };
}
