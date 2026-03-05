import { error } from '@sveltejs/kit';
import { loadVoiceById } from '$lib/catalog';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const voice = await loadVoiceById(params.id);

  if (!voice) {
    throw error(404, 'Voice not found');
  }

  return { voice };
};
