/**
 * Unit tests for lib/text-utilities/*
 *
 * Covers every acceptance-criteria edge case for normalizeText, wordCount,
 * truncateWords, and estimateReadingTime — empty/whitespace inputs,
 * multiple whitespace styles, boundary word counts, ellipsis behaviour,
 * and reading-time estimation.
 */

import { describe, it, expect } from 'vitest';
import { normalizeText, wordCount, truncateWords, estimateReadingTime } from './index';

// ─── normalizeText ───────────────────────────────────────────────────────────

describe('normalizeText', () => {
  it('returns "" for an empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('returns "" for a whitespace-only string', () => {
    expect(normalizeText('   ')).toBe('');
  });

  it('returns "" for tabs and newlines only', () => {
    expect(normalizeText('\t\n  \t')).toBe('');
  });

  it('trims leading whitespace', () => {
    expect(normalizeText('  hello')).toBe('hello');
  });

  it('trims trailing whitespace', () => {
    expect(normalizeText('hello  ')).toBe('hello');
  });

  it('collapses multiple internal spaces to a single space', () => {
    expect(normalizeText('hello    world')).toBe('hello world');
  });

  it('collapses tab characters to a single space', () => {
    expect(normalizeText('hello\tworld')).toBe('hello world');
  });

  it('collapses newline characters to a single space', () => {
    expect(normalizeText('hello\nworld')).toBe('hello world');
  });

  it('handles mixed whitespace (tabs, spaces, newlines)', () => {
    expect(normalizeText('\t  hello \n world  \t')).toBe('hello world');
  });

  it('returns the original word when already normalised', () => {
    expect(normalizeText('hello')).toBe('hello');
  });

  it('handles a realistic paragraph with mixed whitespace', () => {
    const input = '  The quick\tbrown\nfox   jumps  over   the lazy   dog.  ';
    expect(normalizeText(input)).toBe(
      'The quick brown fox jumps over the lazy dog.',
    );
  });
});

// ─── wordCount ───────────────────────────────────────────────────────────────

describe('wordCount', () => {
  it('returns 0 for an empty string', () => {
    expect(wordCount('')).toBe(0);
  });

  it('returns 0 for a whitespace-only string', () => {
    expect(wordCount('   ')).toBe(0);
  });

  it('returns 0 for tabs and newlines only', () => {
    expect(wordCount('\t\n  \t')).toBe(0);
  });

  it('returns 1 for a single word', () => {
    expect(wordCount('hello')).toBe(1);
  });

  it('returns 2 for two words separated by a single space', () => {
    expect(wordCount('hello world')).toBe(2);
  });

  it('returns 2 for two words with extra internal spaces', () => {
    expect(wordCount('hello    world')).toBe(2);
  });

  it('returns 3 for words separated by newlines', () => {
    expect(wordCount('one\ntwo\nthree')).toBe(3);
  });

  it('returns the correct count with leading and trailing whitespace', () => {
    expect(wordCount('  one two three  ')).toBe(3);
  });

  it('returns the correct count with mixed whitespace', () => {
    expect(wordCount('\tone  two\nthree\t')).toBe(3);
  });
});

// ─── truncateWords ───────────────────────────────────────────────────────────

describe('truncateWords', () => {
  // Zero / negative maxWords
  it('returns "" when maxWords is 0', () => {
    expect(truncateWords('hello world', 0)).toBe('');
  });

  it('returns "" when maxWords is negative', () => {
    expect(truncateWords('hello world', -1)).toBe('');
  });

  it('returns "" when maxWords is -Infinity', () => {
    expect(truncateWords('hello world', -Infinity)).toBe('');
  });

  // Empty / whitespace-only text
  it('returns "" for empty text even with positive maxWords', () => {
    expect(truncateWords('', 5)).toBe('');
  });

  it('returns "" for whitespace-only text even with positive maxWords', () => {
    expect(truncateWords('   ', 5)).toBe('');
  });

  // Fewer words than max (no ellipsis)
  it('returns the normalised text unchanged when fewer words than maxWords', () => {
    expect(truncateWords('hello world', 5)).toBe('hello world');
  });

  it('handles leading/trailing whitespace when fewer words than maxWords', () => {
    expect(truncateWords('  hello world  ', 5)).toBe('hello world');
  });

  // Exactly maxWords (no ellipsis)
  it('returns the normalised text unchanged when exactly maxWords words', () => {
    expect(truncateWords('hello world', 2)).toBe('hello world');
  });

  it('handles leading/trailing whitespace when exactly maxWords', () => {
    expect(truncateWords('  hello world  ', 2)).toBe('hello world');
  });

  // More words (ellipsis appended)
  it('appends ellipsis when more words than maxWords', () => {
    expect(truncateWords('hello beautiful world', 2)).toBe('hello beautiful…');
  });

  it('handles leading/trailing whitespace when more words than maxWords', () => {
    expect(truncateWords('  hello beautiful world  ', 2)).toBe(
      'hello beautiful…',
    );
  });

  it('truncates a long phrase to exactly one word', () => {
    expect(truncateWords('one two three four five', 1)).toBe('one…');
  });

  it('does not append ellipsis when single word at maxWords=1', () => {
    expect(truncateWords('hello', 1)).toBe('hello');
  });

  it('returns "" for a single word when maxWords is 0', () => {
    expect(truncateWords('hello', 0)).toBe('');
  });

  it('handles many extra whitespace characters before truncation', () => {
    expect(truncateWords('a   b   c   d', 2)).toBe('a b…');
  });
});

// ─── estimateReadingTime ─────────────────────────────────────────────────────

describe('estimateReadingTime', () => {
  it('returns 0 for an empty string', () => {
    expect(estimateReadingTime('')).toBe(0);
  });

  it('returns 0 for whitespace-only input', () => {
    expect(estimateReadingTime('   ')).toBe(0);
  });

  it('returns 1 for 200 words at default 200 wpm', () => {
    const text = Array(200).fill('word').join(' ');
    expect(estimateReadingTime(text)).toBe(1);
  });

  it('returns 2 for 201 words at default 200 wpm', () => {
    const text = Array(201).fill('word').join(' ');
    expect(estimateReadingTime(text)).toBe(2);
  });

  it('returns 2 for 100 words at custom 50 wpm', () => {
    const text = Array(100).fill('word').join(' ');
    expect(estimateReadingTime(text, 50)).toBe(2);
  });
});
