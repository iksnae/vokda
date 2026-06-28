import { describe, it, expect } from 'vitest';
import {
  SSML_TAGS,
  getTagDef,
  getAttrDef,
  getTagsForProvider,
  isTagSupportedByProvider,
  type SsmlTagDef
} from './tags';

describe('SSML Tag Registry', () => {
  it('should contain all 7 core tags', () => {
    const names = SSML_TAGS.map((t) => t.tag);
    expect(names).toContain('break');
    expect(names).toContain('emphasis');
    expect(names).toContain('prosody');
    expect(names).toContain('say-as');
    expect(names).toContain('phoneme');
    expect(names).toContain('sub');
    expect(names).toContain('lang');
  });

  it('getTagDef returns correct tag by name', () => {
    const brk = getTagDef('break');
    expect(brk).toBeDefined();
    expect(brk!.tag).toBe('break');
    expect(brk!.selfClosing).toBe(true);
    expect(brk!.category).toBe('flow');
  });

  it('getTagDef returns undefined for unknown tag', () => {
    expect(getTagDef('nonexistent')).toBeUndefined();
  });

  it('getTagDef with all-uppercase PROSODY returns the prosody definition', () => {
    const def = getTagDef('PROSODY');
    expect(def).toBeDefined();
    expect(def!.tag).toBe('prosody');
    expect(def!.category).toBe('prosody');
  });

  it('getTagDef with mixed-case Break returns the break definition', () => {
    const def = getTagDef('Break');
    expect(def).toBeDefined();
    expect(def!.tag).toBe('break');
    expect(def!.selfClosing).toBe(true);
  });

  it('getTagDef with lowercase emphasis returns emphasis definition (regression)', () => {
    const def = getTagDef('emphasis');
    expect(def).toBeDefined();
    expect(def!.tag).toBe('emphasis');
    expect(def!.selfClosing).toBe(false);
  });

  it('getTagDef with unknown tag nonexistent returns undefined (regression)', () => {
    expect(getTagDef('nonexistent')).toBeUndefined();
  });

  it('isTagSupportedByProvider case-insensitive for PROSODY/prosody', () => {
    expect(isTagSupportedByProvider('PROSODY', 'aws-polly')).toEqual(
      isTagSupportedByProvider('prosody', 'aws-polly')
    );
  });

  it('break tag is self-closing', () => {
    const brk = getTagDef('break')!;
    expect(brk.selfClosing).toBe(true);
  });

  it('emphasis tag wraps content', () => {
    const emp = getTagDef('emphasis')!;
    expect(emp.selfClosing).toBe(false);
  });

  it('every tag has a label, description, and category', () => {
    for (const tag of SSML_TAGS) {
      expect(tag.label).toBeTruthy();
      expect(tag.description).toBeTruthy();
      expect(['flow', 'prosody', 'pronunciation', 'identity']).toContain(tag.category);
    }
  });

  it('every tag has provider compatibility entries', () => {
    for (const tag of SSML_TAGS) {
      expect(tag.providers).toBeDefined();
      expect(typeof tag.providers['aws-polly']).toBe('boolean');
      expect(typeof tag.providers['azure-speech']).toBe('boolean');
      expect(typeof tag.providers['gcp-tts']).toBe('boolean');
      expect(typeof tag.providers['edge-tts']).toBe('boolean');
    }
  });

  describe('provider filtering', () => {
    it('getTagsForProvider returns only supported tags', () => {
      const edgeTags = getTagsForProvider('edge-tts');
      const edgeTagNames = edgeTags.map((t) => t.tag);
      // edge-tts does NOT support phoneme
      expect(edgeTagNames).not.toContain('phoneme');
      // but does support break, emphasis, prosody
      expect(edgeTagNames).toContain('break');
      expect(edgeTagNames).toContain('emphasis');
      expect(edgeTagNames).toContain('prosody');
    });

    it('isTagSupportedByProvider checks correctly', () => {
      expect(isTagSupportedByProvider('phoneme', 'aws-polly')).toBe(true);
      expect(isTagSupportedByProvider('phoneme', 'edge-tts')).toBe(false);
      expect(isTagSupportedByProvider('lang', 'gcp-tts')).toBe(false);
      expect(isTagSupportedByProvider('lang', 'azure-speech')).toBe(true);
    });

    it('unknown provider returns no supported tags', () => {
      const tags = getTagsForProvider('openai');
      expect(tags.length).toBe(0);
    });
  });

  describe('getAttrDef', () => {
    it('known attribute (tag break, attr time) returns correct SsmlAttrDef', () => {
      const def = getAttrDef('break', 'time');
      expect(def).toBeDefined();
      expect(def!.name).toBe('time');
    });

    it('case-insensitive match (tag BREAK, attr TIME) returns same result as exact case', () => {
      const defLower = getAttrDef('break', 'time');
      const defUpper = getAttrDef('BREAK', 'TIME');
      expect(defUpper).toBeDefined();
      expect(defUpper!.name).toBe(defLower!.name);
    });

    it('unknown tag (nonexistent) returns undefined', () => {
      expect(getAttrDef('nonexistent', 'time')).toBeUndefined();
    });

    it('known tag (break) with unknown attribute (nonexistent) returns undefined', () => {
      expect(getAttrDef('break', 'nonexistent')).toBeUndefined();
    });
  });

  describe('attributes', () => {
    it('break has time and strength attributes', () => {
      const brk = getTagDef('break')!;
      const attrNames = brk.attributes.map((a) => a.name);
      expect(attrNames).toContain('time');
      expect(attrNames).toContain('strength');
    });

    it('prosody has rate, pitch, volume attributes', () => {
      const pros = getTagDef('prosody')!;
      const attrNames = pros.attributes.map((a) => a.name);
      expect(attrNames).toContain('rate');
      expect(attrNames).toContain('pitch');
      expect(attrNames).toContain('volume');
    });

    it('say-as has interpret-as attribute with options', () => {
      const sayAs = getTagDef('say-as')!;
      const interpretAs = sayAs.attributes.find((a) => a.name === 'interpret-as');
      expect(interpretAs).toBeDefined();
      expect(interpretAs!.type).toBe('select');
      expect(interpretAs!.options!.length).toBeGreaterThan(0);
    });

    it('phoneme has alphabet and ph attributes', () => {
      const ph = getTagDef('phoneme')!;
      const attrNames = ph.attributes.map((a) => a.name);
      expect(attrNames).toContain('alphabet');
      expect(attrNames).toContain('ph');
    });
  });
});
