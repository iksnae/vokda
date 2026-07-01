import { normalizeText } from './normalize-text';

/**
 * Counts the number of words in a text string.
 *
 * Normalises the input via {@link normalizeText} — collapsing all whitespace
 * runs to single spaces and trimming.  If the normalised result is the empty
 * string, returns `0`.  Otherwise splits on spaces and returns the array
 * length.
 *
 * ## Guarantees
 *
 * - The function is **pure**: no side effects beyond calling
 *   {@link normalizeText} (which is itself pure).
 * - Returns `0` for empty input, whitespace-only input, or any input whose
 *   normalised form is `""`.
 * - The count is based on space-delimited tokens, consistent with the
 *   normalisation applied by {@link normalizeText}.
 *
 * @param text - The raw text whose words should be counted.
 * @returns The number of space-separated words in the normalised text.
 *
 * @example
 *   wordCount('Hello world')  // 2
 *   wordCount('  One   two ') // 2
 *   wordCount('')             // 0
 *   wordCount('   ')          // 0
 */
export function wordCount(text: string): number {
  const normalised = normalizeText(text);
  if (normalised === '') return 0;
  return normalised.split(' ').length;
}
