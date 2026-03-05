import type { Voice } from './types';
import { catalogVoices } from './data/catalog';

export async function loadCatalog(): Promise<Voice[]> {
  return catalogVoices;
}

export async function loadVoiceById(voiceId: string): Promise<Voice | null> {
  const voices = await loadCatalog();
  return voices.find((voice) => voice.id === voiceId) ?? null;
}
