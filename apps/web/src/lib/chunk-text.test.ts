import { describe, it, expect } from 'vitest';
import { chunkText } from './chunk-text';

describe('chunkText', () => {
  // 1. Empty string
  it('returns an empty array for an empty string', () => {
    expect(chunkText('', 10)).toEqual([]);
  });

  // 2. Whitespace-only
  it('returns an empty array for whitespace-only input', () => {
    expect(chunkText('   ', 10)).toEqual([]);
    expect(chunkText('\t\n ', 10)).toEqual([]);
  });

  // 3. Under-limit single chunk
  it('returns a single-element array when text is shorter than maxLength', () => {
    expect(chunkText('Hello', 10)).toEqual(['Hello']);
  });

  // 4. Exactly-at-limit
  it('returns a single-element array when text length equals maxLength', () => {
    expect(chunkText('Hello', 5)).toEqual(['Hello']);
  });

  // 5. Multi-sentence packing
  it('packs sentences greedily without splitting them', () => {
    // 'Hello. World!' — maxLength 7: each sentence fits in its own chunk
    expect(chunkText('Hello. World!', 7)).toEqual(['Hello.', ' World!']);
  });

  // 6. Over-long single sentence hard-split
  it('hard-splits a single sentence that exceeds maxLength', () => {
    const result = chunkText('abcdefgh', 3); // 8 chars, max 3 → 3 chunks
    expect(result).toEqual(['abc', 'def', 'gh']);
    // No character loss
    expect(result.join('')).toBe('abcdefgh');
  });

  // 7. Invariant: no chunk exceeds maxLength
  it('never produces a chunk longer than maxLength', () => {
    const inputs = [
      { text: 'Hello. World!', max: 7 },
      { text: 'A. B. C. D. E.', max: 4 },
      { text: 'Supercalifragilisticexpialidocious', max: 5 },
      { text: 'Short.', max: 100 },
      { text: 'One. Two. Three. Four. Five.', max: 10 },
      { text: 'No punctuation just a long string of text', max: 8 },
    ];
    for (const { text, max } of inputs) {
      const chunks = chunkText(text, max);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(max);
      }
    }
  });

  // 8. Invariant: content preservation — chunks.join('') === trimmed input
  it('preserves all characters (chunks.join equals trimmed input)', () => {
    const inputs = [
      'Hello. World!',
      '   padded   ',
      'A. B. C. D. E.',
      'Supercalifragilisticexpialidocious',
      'One. Two. Three.',
      'No punctuation here',
      '', // empty stays empty
      '   ', // whitespace stays empty
    ];
    for (const text of inputs) {
      const chunks = chunkText(text, 10);
      expect(chunks.join('')).toBe(text.trim());
    }
  });

  // 9. maxLength <= 0 throws
  it('throws when maxLength is zero or negative', () => {
    expect(() => chunkText('text', 0)).toThrow('maxLength must be a positive number');
    expect(() => chunkText('text', -1)).toThrow('maxLength must be a positive number');
    expect(() => chunkText('text', -100)).toThrow('maxLength must be a positive number');
  });

  // 10. Mixed: normal sentences + one over-long sentence
  it('handles a mix of normal and over-long sentences', () => {
    // "Hi." (3) + " Superlongword Bye." (19) — only one sentence boundary
    // after "Hi." because "Superlongword Bye." has no internal .!? + whitespace.
    // maxLength 5
    const result = chunkText('Hi. Superlongword Bye.', 5);
    // "Hi." → chunk 1
    // " Superlongword Bye." (19 chars) hard-split into 5-char slices:
    //   " Supe" (5), "rlong" (5), "word " (5), "Bye." (4)
    expect(result).toEqual(['Hi.', ' Supe', 'rlong', 'word ', 'Bye.']);
    // Verify no character loss
    expect(result.join('')).toBe('Hi. Superlongword Bye.');
  });
});
