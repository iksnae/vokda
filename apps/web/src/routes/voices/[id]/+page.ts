import { loadVoiceById, loadCatalog } from '$lib/catalog';
import type { PageLoad } from './$types';

export const prerender = false;

export const load: PageLoad = async ({ fetch, params }) => {
  const [voice, catalog] = await Promise.all([
    loadVoiceById(fetch, params.id),
    loadCatalog(fetch),
  ]);
  return { voice, voiceId: params.id, catalog };
};
