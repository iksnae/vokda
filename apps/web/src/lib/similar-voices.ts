/**
 * "Similar voices" recommendation — pure scoring over the catalog.
 *
 * Scores every other voice by how much it resembles the target along the axes
 * a user actually picks on: language, gender, age, quality tier, and shared
 * descriptive tags. Returns the top matches. Side-effect-free and catalog-shape
 * agnostic so it can be unit-tested without the app.
 */

import type { Voice } from '$lib/types';
import { getPrimaryLanguage } from '$lib/language-utils';

function similarityScore(target: Voice, candidate: Voice): number {
  let score = 0;

  if (getPrimaryLanguage(candidate) === getPrimaryLanguage(target)) score += 3;

  const tg = target.metadata?.genderPresentation;
  if (tg && candidate.metadata?.genderPresentation === tg) score += 2;

  const ta = target.metadata?.agePresentation;
  if (ta && candidate.metadata?.agePresentation === ta) score += 1;

  if (candidate.qualityTier === target.qualityTier) score += 1;

  const targetTags = new Set((target.tags ?? []).map((t) => t.toLowerCase()));
  for (const tag of candidate.tags ?? []) {
    if (targetTags.has(tag.toLowerCase())) score += 1;
  }

  return score;
}

export function findSimilarVoices(target: Voice, catalog: Voice[], limit = 6): Voice[] {
  return catalog
    .filter((v) => v.id !== target.id)
    .map((v) => ({ v, score: similarityScore(target, v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.v);
}
