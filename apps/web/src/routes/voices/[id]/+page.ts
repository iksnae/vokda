import { loadVoiceById } from '$lib/catalog';
import type { PageLoad } from './$types';

export const prerender = false;

export const load: PageLoad = async ({ fetch, params }) => {
  const voice = await loadVoiceById(fetch, params.id);
  return { voice, voiceId: params.id };
};
