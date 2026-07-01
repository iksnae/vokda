import { wordCount } from './word-count';

/**
 * Estimates reading time for a given text.
 *
 * Uses {@link wordCount} to count words, then divides by the reading speed
 * (default 200 words per minute) and rounds up with `Math.ceil`.
 *
 * ## Guarantees
 *
 * - Returns `0` for empty text, whitespace-only text, or any text with zero
 *   words.
 * - Always returns a non-negative integer.
 * - Default reading speed is 200 words per minute when not specified.
 *
 * @param text - The text whose reading time should be estimated.
 * @param wordsPerMinute - Reading speed in words per minute (default 200).
 * @returns Estimated reading time in minutes, rounded up to the nearest integer.
 *
 * @example
 *   estimateReadingTime('Hello world')        // 1 (2 words ÷ 200 wpm → 1)
 *   estimateReadingTime('...200 words...')    // 1 (200 words ÷ 200 wpm → 1)
 *   estimateReadingTime('...201 words...')    // 2 (201 words ÷ 200 wpm → 2)
 *   estimateReadingTime('100 words', 50)      // 2 (100 words ÷ 50 wpm → 2)
 */
export function estimateReadingTime(
  text: string,
  wordsPerMinute: number = 200,
): number {
  const words = wordCount(text);
  if (words === 0) return 0;
  return Math.ceil(words / wordsPerMinute);
}
