import { loadCatalog } from '$lib/catalog';
import type { PageLoad } from './$types';

export const prerender = false;

export const load: PageLoad = async ({ fetch, params }) => {
  const voices = await loadCatalog(fetch);
  return { voices, collectionId: params.id };
};
