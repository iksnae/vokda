/**
 * Unit tests for lib/chunk-text.ts
 *
 * Covers every specified edge case and invariant for the chunkText utility,
 * including empty/whitespace inputs, under-limit and exactly-at-limit
 * single chunks, multi-sentence greedy packing, hard-split of over-long
 * sentences, and mixed scenarios.
 */

import { describe, it, expect } from 'vitest';
import { chunkText } from './chunk-text';

// ─── Basic edge cases ────────────────────────────────────────────────────────

describe('chunkText', () => {
  // 1. Empty string
  it('returns [] for an empty string', () => {
    expect(chunkText('', 100)).toEqual([]);
  });

  // 2. Whitespace-only
  it('returns [] for a whitespace-only string', () => {
    expect(chunkText('   ', 100)).toEqual([]);
  });

  it('returns [] for a string of tabs and newlines', () => {
    expect(chunkText('\t\n  \t', 100)).toEqual([]);
  });

  // 3. Under-limit single chunk
  it('returns a single chunk when text is shorter than maxLength', () => {
    expect(chunkText('Hello', 100)).toEqual(['Hello']);
  });

  // 4. Exactly-at-limit single chunk
  it('returns a single chunk when text length equals maxLength', () => {
    expect(chunkText('Hello', 5)).toEqual(['Hello']);
  });

  // ─── Sentence-boundary packing ──────────────────────────────────────────

  // 5. Multi-sentence packing
  it('packs sentences greedily, respecting boundaries', () => {
    // maxLength 7: "Hello." is 6, " World!" is 7 → they can't both fit
    const result = chunkText('Hello. World!', 7);
    expect(result).toEqual(['Hello.', ' World!']);
  });

  it('keeps sentences together when they fit in the same chunk', () => {
    // "Hi." = 3, " Bye." = 5, total 8, maxLength 10 → fit together
    const result = chunkText('Hi. Bye.', 10);
    expect(result).toEqual(['Hi. Bye.']);
  });

  it('creates multiple chunks as needed for many short sentences', () => {
    const result = chunkText('A. B. C. D. E.', 6);
    // "A. B." = 5 (fits), next " C." = 3 → 5+3=8 > 6 → new chunk
    // "C. D." = 5, " E." = 3 → 5+3=8 > 6 → new chunk
    expect(result).toEqual(['A. B.', ' C. D.', ' E.']);
  });

  // ─── Hard-split for over-long sentences ─────────────────────────────────

  // 6. Over-long single sentence hard-split
  it('hard-splits a single sentence that exceeds maxLength', () => {
    const result = chunkText('Hi there', 3);
    expect(result).toEqual(['Hi ', 'the', 're']);
    // Character-level preservation
    expect(result.join('')).toBe('Hi there');
  });

  it('hard-splits a long sentence into exactly maxLength pieces', () => {
    const result = chunkText('1234567890', 3);
    expect(result).toEqual(['123', '456', '789', '0']);
    expect(result.join('')).toBe('1234567890');
  });

  it('handles a single character at maxLength 1', () => {
    const result = chunkText('abc', 1);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  // ─── Invariants ────────────────────────────────────────────────────────

  // 7. No chunk exceeds maxLength
  it('ensures no chunk exceeds maxLength (property check)', () => {
    const inputs = [
      { text: 'Hello. World!', max: 7 },
      { text: 'Short. Sentences. Here.', max: 9 },
      { text: 'A really long sentence without any punctuation at all', max: 10 },
      { text: 'Hi', max: 1 },
      { text: 'A. B. C. D. E. F. G.', max: 5 },
      { text: 'One', max: 100 },
    ];

    for (const { text, max } of inputs) {
      const chunks = chunkText(text, max);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(max);
      }
    }
  });

  // 8. Content preservation — character-level reconstruction
  it('preserves all content when chunks are joined', () => {
    const inputs = [
      'Hello. World!',
      'Short. Sentences. Here.',
      'A really long sentence without any punctuation at all',
      'Hi',
      'A. B. C. D. E. F. G.',
      'One',
    ];

    for (const text of inputs) {
      const chunks = chunkText(text, 10);
      expect(chunks.join('')).toBe(text);
    }
  });

  // ─── maxLength <= 0 throws ─────────────────────────────────────────────

  // 9. Invalid maxLength
  it('throws when maxLength is 0', () => {
    expect(() => chunkText('text', 0)).toThrow('maxLength must be a positive number');
  });

  it('throws when maxLength is negative', () => {
    expect(() => chunkText('text', -1)).toThrow('maxLength must be a positive number');
  });

  it('throws when maxLength is -Infinity', () => {
    expect(() => chunkText('text', -Infinity)).toThrow('maxLength must be a positive number');
  });

  it('does not throw for a positive maxLength', () => {
    expect(() => chunkText('text', 1)).not.toThrow();
    expect(() => chunkText('text', 100)).not.toThrow();
    expect(() => chunkText('text', Infinity)).not.toThrow();
  });

  // ─── Mixed scenarios ───────────────────────────────────────────────────

  // 10. Mixed: normal sentences + one over-long sentence
  it('handles a mix of normal sentences and one over-long sentence', () => {
    const text = 'Hi. This is a very long sentence without punctuation. Bye.';
    const result = chunkText(text, 15);
    // "Hi." = 3, " This is a very long sentence without punctuation." = let me count...
    // " This is a very long sentence without punctuation." = 51 chars > 15 → hard split
    // Then " Bye." = 5

    // Segment 1: "Hi." (3 chars) → fits
    // Segment 2: " This is a very long sentence without punctuation." (51 chars) > 15 → flush, hard-split
    // Segment 3: " Bye." (5 chars) → fits

    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(15);
    }
    expect(result.join('')).toBe(text);
  });

  it('handles text with only over-long segments', () => {
    const result = chunkText('HelloWorld!', 3);
    // Single segment "HelloWorld!" is 11 chars > 3 → hard-split
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(3);
    }
    expect(result.join('')).toBe('HelloWorld!');
  });

  // ─── Issue #52: punctuation runs ──────────────────────────────────────

  // (a) Issue reproductions — consecutive punctuation must not be dropped
  it('preserves ellipsis punctuation runs (Wait... what?)', () => {
    const result = chunkText('Wait... what?', 8);
    expect(result.join('')).toBe('Wait... what?');
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(8);
    }
  });

  it('preserves mixed consecutive punctuation (Really?! No way.)', () => {
    const result = chunkText('Really?! No way.', 9);
    expect(result.join('')).toBe('Really?! No way.');
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(9);
    }
  });

  it('preserves dot-space-dot sequences (End. . . done.)', () => {
    const result = chunkText('End. . . done.', 6);
    expect(result.join('')).toBe('End. . . done.');
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(6);
    }
  });

  // (b) Property-based exact-reconstruction for punctuation-heavy inputs
  it('preserves exact character reconstruction for punctuation-heavy inputs', () => {
    const inputs = [
      'Wait... what?',
      'Really?! No way.',
      'End. . . done.',
      'Hello... world!!! How are you?',
      'What?! Really?! No...',
      '!!! Look at this.',
      'Sentence one.  Sentence two...  Sentence three!',
      'Mixed?!. punctuation... here!',
      'A. B. C. D. E. F. G.',
      'No punctuation at all',
    ];

    for (const text of inputs) {
      const chunks = chunkText(text, 10);
      expect(chunks.join('')).toBe(text.trim());
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(10);
      }
    }
  });

  // (c) Hard-split with punctuation run straddling a maxLength boundary
  it('handles a punctuation run that straddles a maxLength boundary', () => {
    // "Hi!!!" = 5 chars, maxLength 3 → hard-split should preserve all chars
    const result = chunkText('Hi!!!', 3);
    expect(result.join('')).toBe('Hi!!!');
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(3);
    }
  });
});
