import { normalizeText } from './normalize-text';

/**
 * Truncates a text string to a maximum number of words.
 *
 * Normalises the input via {@link normalizeText} — collapsing all whitespace
 * runs to single spaces and trimming.  If `maxWords <= 0` or the normalised
 * text is `""`, returns `""`.  Otherwise splits the normalised text on spaces
 * and:
 *
 * - If the number of words is **less than or equal to** `maxWords`, returns
 *   the normalised text unchanged (no ellipsis).
 * - If the number of words **exceeds** `maxWords`, joins the first `maxWords`
 *   words with spaces and appends `…` (U+2026 HORIZONTAL ELLIPSIS).
 *
 * ## Guarantees
 *
 * - The function is **pure**: no side effects beyond calling
 *   {@link normalizeText} (which is itself pure).
 * - Returns `""` for empty input, whitespace-only input, or when `maxWords`
 *   is zero or negative.
 * - Does **not** add an ellipsis when the word count is already within the
 *   limit.
 * - The return value contains no leading or trailing whitespace (inherited
 *   from {@link normalizeText}).
 *
 * @param text     - The raw text to truncate.
 * @param maxWords - The maximum number of words to retain (must be > 0 to
 *                   produce output).
 * @returns The truncated text, possibly suffixed with `…`, or `""`.
 *
 * @example
 *   truncateWords('Hello beautiful world', 2)   // 'Hello beautiful…'
 *   truncateWords('Hello world', 5)              // 'Hello world'
 *   truncateWords('Hello world', 2)              // 'Hello world'
 *   truncateWords('', 5)                         // ''
 *   truncateWords('  One two three  ', 1)        // 'One…'
 *   truncateWords('Word', 0)                     // ''
 */
export function truncateWords(text: string, maxWords: number): string {
  if (maxWords <= 0) return '';
  const normalised = normalizeText(text);
  if (normalised === '') return '';
  const words = normalised.split(' ');
  if (words.length <= maxWords) return normalised;
  return words.slice(0, maxWords).join(' ') + '…';
}
