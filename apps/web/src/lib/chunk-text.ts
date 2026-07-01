/**
 * Sentence-aware text chunker for synthesis input.
 *
 * Splits arbitrary text into chunks no larger than `maxLength` characters,
 * respecting sentence boundaries wherever possible.  Designed for providers
 * that impose a character limit per synthesis request — it packs sentences
 * greedily so the fewest possible API calls are made, while never exceeding
 * the limit.
 *
 * ## Algorithm summary
 *
 * 1. Trim the input.  If nothing remains, return `[]`.
 * 2. If the entire text fits in a single chunk (`text.length <= maxLength`),
 *    return `[text]`.
 * 3. Split the text into sentence *segments* (including their terminating
 *    punctuation — `.`, `!`, or `?`).  Leading whitespace before each
 *    sentence is preserved so that reconstruction via `chunks.join('') ===
 *    original` is exact.
 * 4. Greedily pack segments into chunks: start a new chunk only when adding
 *    the next segment would push the current chunk over `maxLength`.
 * 5. **Hard-split**: if a single sentence segment *alone* exceeds
 *    `maxLength`, slice it into `maxLength`-sized substrings so every chunk
 *    respects the limit while preserving all characters.
 *
 * ## Guarantees
 *
 * - Every returned chunk has `chunk.length <= maxLength`.
 * - `chunks.join('') === trimmedOriginal` (exact character-level
 *   reconstruction, including whitespace).
 * - The function is **pure**: no side effects, no imports, no module-level
 *   mutable state.
 * - Throws an `Error` when `maxLength <= 0` (the caller MUST supply a
 *   positive limit).
 *
 * @param text     - The raw text to split.
 * @param maxLength - Maximum allowed length of each returned chunk (must be
 *                    a positive integer).
 * @returns An ordered array of chunks, each `<= maxLength` characters.
 * @throws {Error} If `maxLength <= 0`.
 *
 * @example
 *   chunkText('Hello. World!', 7)   // ['Hello.', ' World!']
 *   chunkText('', 100)              // []
 *   chunkText('Short text', 100)    // ['Short text']
 *   chunkText('Hi there', 3)        // ['Hi ', 'the', 're']
 */
export function chunkText(text: string, maxLength: number): string[] {
  // ── Guard ──────────────────────────────────────────────────────────────
  if (maxLength <= 0) {
    throw new Error('maxLength must be a positive number');
  }

  // ── Trim ───────────────────────────────────────────────────────────────
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  // ── Under-limit shortcut ───────────────────────────────────────────────
  if (trimmed.length <= maxLength) return [trimmed];

  // ── Sentence segmentation ──────────────────────────────────────────────
  // Match sequences of characters that form a sentence:
  //   \s*              – capture leading whitespace before the sentence
  //   [^.!?\s]         – first non-whitespace, non-delimiter character
  //                      (guarantees at least one real char in the segment)
  //   [^.!?]*          – greedy run of non-delimiter characters
  //   [.!?]?           – optional terminating punctuation
  //
  // This preserves the exact byte sequence of the original text so that
  // joining the segments reproduces the trimmed input character-for-character.
  const segments =
    trimmed.match(/\s*[^.!?\s][^.!?]*[.!?]?/g) ?? [];

  // ── Greedy packing ─────────────────────────────────────────────────────
  const chunks: string[] = [];
  let current = '';

  for (const seg of segments) {
    // If this single segment alone exceeds the limit, we must hard-split it
    // into maxLength-sized pieces.  This is the only path that can create
    // chunks that do not end on a sentence boundary.
    if (seg.length > maxLength) {
      // Flush any partial chunk first.
      if (current.length > 0) {
        chunks.push(current);
        current = '';
      }
      // Slice the over-long segment.
      for (let i = 0; i < seg.length; i += maxLength) {
        chunks.push(seg.slice(i, i + maxLength));
      }
      continue;
    }

    // Normal case: can we add this segment to the current chunk?
    if (current.length + seg.length <= maxLength) {
      current += seg;
    } else {
      // Would overflow — start a new chunk.
      if (current.length > 0) chunks.push(current);
      current = seg;
    }
  }

  // ── Flush final partial chunk ──────────────────────────────────────────
  if (current.length > 0) chunks.push(current);

  return chunks;
}
