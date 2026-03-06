import { describe, it, expect } from 'vitest';
import { wrapSpeak, insertTag } from './serialize';
import { getTagDef } from './tags';

describe('SSML Serializer', () => {
  describe('wrapSpeak', () => {
    it('wraps plain text in <speak>', () => {
      expect(wrapSpeak('Hello')).toBe('<speak>Hello</speak>');
    });

    it('does not double-wrap if already wrapped', () => {
      expect(wrapSpeak('<speak>Hello</speak>')).toBe('<speak>Hello</speak>');
    });

    it('wraps content with tags but no <speak>', () => {
      expect(wrapSpeak('<break time="500ms"/>Hello')).toBe(
        '<speak><break time="500ms"/>Hello</speak>'
      );
    });

    it('handles empty string', () => {
      expect(wrapSpeak('')).toBe('<speak></speak>');
    });
  });

  describe('insertTag — self-closing (break)', () => {
    const breakTag = getTagDef('break')!;

    it('inserts break at cursor with time attr', () => {
      const result = insertTag('Hello world', 5, 5, breakTag, { time: '500ms' });
      expect(result.text).toBe('Hello<break time="500ms"/> world');
      expect(result.cursorPos).toBe('Hello<break time="500ms"/>'.length);
    });

    it('inserts break with strength attr', () => {
      const result = insertTag('AB', 1, 1, breakTag, { strength: 'strong' });
      expect(result.text).toBe('A<break strength="strong"/>B');
    });

    it('inserts break with no attrs (default)', () => {
      const result = insertTag('AB', 1, 1, breakTag, {});
      expect(result.text).toBe('A<break/>B');
    });

    it('replaces selection with self-closing tag', () => {
      // Selection from 5..10 in "Hello world" = " worl"
      const result = insertTag('Hello world', 5, 10, breakTag, { time: '1s' });
      expect(result.text).toBe('Hello<break time="1s"/>d');
    });
  });

  describe('insertTag — wrapping (emphasis)', () => {
    const emphasisTag = getTagDef('emphasis')!;

    it('wraps selected text', () => {
      const result = insertTag('Hello world', 6, 11, emphasisTag, { level: 'strong' });
      expect(result.text).toBe('Hello <emphasis level="strong">world</emphasis>');
    });

    it('inserts empty tag at cursor when no selection', () => {
      const result = insertTag('Hello', 5, 5, emphasisTag, { level: 'moderate' });
      expect(result.text).toBe('Hello<emphasis level="moderate"></emphasis>');
      // Cursor should be between opening and closing tags
      expect(result.cursorPos).toBe('Hello<emphasis level="moderate">'.length);
    });
  });

  describe('insertTag — prosody with multiple attrs', () => {
    const prosodyTag = getTagDef('prosody')!;

    it('includes only non-empty attrs', () => {
      const result = insertTag('Say this', 0, 8, prosodyTag, {
        rate: 'slow',
        pitch: '',
        volume: 'loud',
      });
      expect(result.text).toBe('<prosody rate="slow" volume="loud">Say this</prosody>');
    });
  });

  describe('insertTag — phoneme', () => {
    const phonemeTag = getTagDef('phoneme')!;

    it('wraps with alphabet and ph attrs', () => {
      const result = insertTag('tomato', 0, 6, phonemeTag, {
        alphabet: 'ipa',
        ph: 'təˈmeɪ.toʊ',
      });
      expect(result.text).toBe('<phoneme alphabet="ipa" ph="təˈmeɪ.toʊ">tomato</phoneme>');
    });
  });

  describe('edge cases', () => {
    const breakTag = getTagDef('break')!;

    it('inserts at beginning of string', () => {
      const result = insertTag('Hello', 0, 0, breakTag, { time: '1s' });
      expect(result.text).toBe('<break time="1s"/>Hello');
    });

    it('inserts at end of string', () => {
      const result = insertTag('Hello', 5, 5, breakTag, { time: '1s' });
      expect(result.text).toBe('Hello<break time="1s"/>');
    });
  });
});
