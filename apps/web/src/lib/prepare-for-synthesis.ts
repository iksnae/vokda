/**
 * Compose normalizeText + chunkText + wordCount into a single preparation
 * pipeline suitable for synthesis providers.
 *
 * The exported `prepareForSynthesis` function:
 * 1. Normalises the input via {@link normalizeText} (collapses whitespace).
 * 2. Passes the normalised text to {@link chunkText} so the result respects
 *    sentence boundaries and the per-chunk `maxLength` limit.
 * 3. Maps every chunk to a {@link SynthesisChunk} with its `wordCount`.
 *
 * ## Guarantees
 *
 * - The function is **pure**: no side effects.
 * - Empty or whitespace-only input returns `[]`.
 * - Non-positive `maxLength` throws (delegated to `chunkText`).
 *
 * @see normalizeText
 * @see chunkText
 * @see wordCount
 */

import { normalizeText, wordCount } from './text-utilities';
import { chunkText } from './chunk-text';

/** A single synthesis-ready chunk with its word count. */
export interface SynthesisChunk {
  /** The chunk text (already normalised). */
  text: string;
  /** Number of words in this chunk (space-delimited count). */
  wordCount: number;
}

/**
 * Normalise arbitrary text and split it into synthesis-ready chunks.
 *
 * @param text      - The raw input text.
 * @param maxLength - Maximum characters per chunk (positive integer).
 * @returns An array of chunks, each `<= maxLength`, or `[]` for empty input.
 * @throws {Error} When `maxLength <= 0` (delegated to `chunkText`).
 */
export function prepareForSynthesis(
  text: string,
  maxLength: number,
): SynthesisChunk[] {
  const normalised = normalizeText(text);
  const chunks = chunkText(normalised, maxLength);
  return chunks.map((chunk) => ({
    text: chunk,
    wordCount: wordCount(chunk),
  }));
}
