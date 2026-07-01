/**
 * Unit tests for lib/prepare-for-synthesis.ts
 *
 * Covers all acceptance criteria from issue #50:
 * 1. Empty/whitespace input returns []
 * 2. Single chunk under limit returns one SynthesisChunk with correct wordCount
 * 3. Multi-chunk splitting returns multiple elements and join reconstructs
 *    the normalised input
 * 4. Each chunk's wordCount matches the actual word count of chunk.text
 * 5. Invariant: every chunk.text.length <= maxLength
 * 6. Non-positive maxLength (0, -1, -Infinity) throws
 */

import { describe, it, expect } from 'vitest';
import { prepareForSynthesis } from './prepare-for-synthesis';

// ─── Acceptance criterion 1: empty / whitespace returns [] ──────────────

describe('prepareForSynthesis', () => {
  it('returns [] for an empty string', () => {
    expect(prepareForSynthesis('', 100)).toEqual([]);
  });

  it('returns [] for a spaces-only string', () => {
    expect(prepareForSynthesis('   ', 100)).toEqual([]);
  });

  it('returns [] for tabs and newlines', () => {
    expect(prepareForSynthesis('\t\n  \t', 100)).toEqual([]);
  });

  // ─── Acceptance criterion 2: single chunk under limit ─────────────────

  it('returns a single chunk with correct wordCount when under maxLength', () => {
    const result = prepareForSynthesis('Hello world', 100);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ text: 'Hello world', wordCount: 2 });
  });

  it('returns a single chunk when the normalised text exactly equals maxLength', () => {
    const result = prepareForSynthesis('abcde', 5);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ text: 'abcde', wordCount: 1 });
  });

  // ─── Acceptance criterion 3: multi-chunk splitting ────────────────────

  it('splits into multiple chunks and reconstruction matches normalised input', () => {
    const text =
      'The quick brown fox jumps over the lazy dog. The dog, however, was not amused. It barked loudly in response.';

    // 45-char first sentence, 34-char second, 31-char third.
    // maxLength 50 → three chunks.
    const maxLength = 50;
    const result = prepareForSynthesis(text, maxLength);

    expect(result.length).toBeGreaterThanOrEqual(2);

    // Reconstruction of chunk texts must equal the normalised input.
    // normalizeText collapses all whitespace to single spaces and trims,
    // so for this prose (already single-spaced) the join reproduces it.
    const reconstructed = result.map((c) => c.text).join('');
    expect(reconstructed).toBe(
      'The quick brown fox jumps over the lazy dog. The dog, however, was not amused. It barked loudly in response.',
    );
  });

  // ─── Acceptance criterion 4: wordCount per chunk is accurate ──────────

  it('sets wordCount to the correct word count for each chunk', () => {
    const text =
      'The quick brown fox jumps over the lazy dog. The dog, however, was not amused. It barked loudly in response.';
    const result = prepareForSynthesis(text, 50);

    // Chunk 0: "The quick brown fox jumps over the lazy dog." → 9 words
    // Chunk 1: " The dog, however, was not amused." → normalised = 6 words
    // Chunk 2: " It barked loudly in response." → normalised = 5 words
    const expectedWordCounts = [9, 6, 5];

    expect(result).toHaveLength(3);
    for (let i = 0; i < result.length; i++) {
      expect(result[i].wordCount).toBe(expectedWordCounts[i]);
    }
  });

  // ─── Acceptance criterion 5: invariant chunk.text.length <= maxLength ─

  it('ensures every chunk length is <= maxLength across varied inputs', () => {
    const scenarios: { text: string; max: number }[] = [
      {
        text: 'The quick brown fox jumps over the lazy dog. The dog, however, was not amused. It barked loudly in response.',
        max: 50,
      },
      {
        text: 'Short. Sentences. Here. And. There.',
        max: 10,
      },
      {
        text: 'A really long sentence without any punctuation at all here we go',
        max: 12,
      },
      { text: 'Hi', max: 1 },
      { text: 'One two three', max: 100 },
    ];

    for (const { text, max } of scenarios) {
      const chunks = prepareForSynthesis(text, max);
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(max);
      }
    }
  });

  // ─── Acceptance criterion 6: non-positive maxLength throws ────────────

  it('throws when maxLength is 0', () => {
    expect(() => prepareForSynthesis('text', 0)).toThrow(
      'maxLength must be a positive number',
    );
  });

  it('throws when maxLength is negative', () => {
    expect(() => prepareForSynthesis('text', -1)).toThrow(
      'maxLength must be a positive number',
    );
  });

  it('throws when maxLength is -Infinity', () => {
    expect(() => prepareForSynthesis('text', -Infinity)).toThrow(
      'maxLength must be a positive number',
    );
  });

  it('does not throw for a positive maxLength', () => {
    expect(() => prepareForSynthesis('text', 1)).not.toThrow();
    expect(() => prepareForSynthesis('text', 100)).not.toThrow();
    expect(() => prepareForSynthesis('text', Infinity)).not.toThrow();
  });

  // ─── Additional: whitespace normalisation is applied before chunking ───

  it('normalises whitespace before chunking', () => {
    // Multiple spaces and newlines should be collapsed, then chunked.
    const result = prepareForSynthesis(
      'Hello   world.\n\nThis  is   a test.',
      100,
    );
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello world. This is a test.');
    expect(result[0].wordCount).toBe(6);
  });
});
