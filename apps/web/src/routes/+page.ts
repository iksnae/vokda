import { loadCatalog } from '$lib/catalog';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const voices = await loadCatalog(fetch);
  return { voices };
};
