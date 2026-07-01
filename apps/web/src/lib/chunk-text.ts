/**
 * A pure, zero-dependency utility for splitting text into sentence-aware chunks.
 *
 * Each chunk respects sentence boundaries where possible and never exceeds the
 * given `maxLength`. When a single sentence is longer than `maxLength`, it is
 * hard-split into `maxLength`-sized pieces with no character loss.
 *
 * @module chunk-text
 */

/**
 * Split `text` into an array of chunks, each no longer than `maxLength`,
 * preferring to break at sentence boundaries (`.`, `!`, `?` followed by
 * whitespace).  Sentences that individually exceed `maxLength` are sliced
 * into `maxLength`-sized substrings.
 *
 * @param text    - The input text to chunk.
 * @param maxLength - Maximum length of each returned chunk.  Must be > 0.
 * @returns An array of chunks.  Returns `[]` when the trimmed input is empty.
 * @throws {Error} When `maxLength <= 0`.
 */
export function chunkText(text: string, maxLength: number): string[] {
  if (maxLength <= 0) {
    throw new Error('maxLength must be a positive number');
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  if (trimmed.length <= maxLength) {
    return [trimmed];
  }

  // Split after sentence-ending punctuation that is followed by whitespace.
  // The punctuation stays attached to its sentence; whitespace leads the next.
  const sentences = trimmed.split(/(?<=[.!?])(?=\s)/);

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    // A single sentence longer than maxLength must be hard-split.
    if (sentence.length > maxLength) {
      if (current.length > 0) {
        chunks.push(current);
        current = '';
      }
      for (let i = 0; i < sentence.length; i += maxLength) {
        chunks.push(sentence.slice(i, i + maxLength));
      }
      continue;
    }

    if (current.length + sentence.length > maxLength) {
      chunks.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}
