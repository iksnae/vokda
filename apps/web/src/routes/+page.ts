import { loadCatalog } from '$lib/catalog';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  const voices = await loadCatalog();
  return { voices };
};
