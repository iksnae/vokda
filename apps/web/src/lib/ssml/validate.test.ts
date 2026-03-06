import { describe, it, expect } from 'vitest';
import { validateSsml } from './validate';

describe('SSML Validator', () => {
  describe('valid SSML', () => {
    it('accepts well-formed <speak> with text', () => {
      const result = validateSsml('<speak>Hello world</speak>', 'aws-polly');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts <speak> with break tag', () => {
      const result = validateSsml('<speak>Hello<break time="500ms"/>world</speak>', 'aws-polly');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts nested prosody and emphasis', () => {
      const result = validateSsml(
        '<speak><prosody rate="slow"><emphasis level="strong">Hello</emphasis></prosody></speak>',
        'azure-speech'
      );
      expect(result.valid).toBe(true);
    });

    it('accepts say-as tag', () => {
      const result = validateSsml(
        '<speak><say-as interpret-as="cardinal">42</say-as></speak>',
        'gcp-tts'
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('structural errors', () => {
    it('rejects empty string', () => {
      const result = validateSsml('', 'aws-polly');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects mismatched tags', () => {
      const result = validateSsml('<speak><emphasis>oops</prosody></speak>', 'aws-polly');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.toLowerCase().includes('tag'))).toBe(true);
    });

    it('rejects unclosed tags', () => {
      const result = validateSsml('<speak><emphasis>oops</speak>', 'aws-polly');
      expect(result.valid).toBe(false);
    });
  });

  describe('auto-wrap behavior', () => {
    it('treats plain text without <speak> as needing wrapper (warning)', () => {
      const result = validateSsml('Hello world', 'aws-polly');
      // Should still validate (auto-wraps) but warn
      expect(result.warnings.some((w) => w.message.toLowerCase().includes('speak'))).toBe(true);
    });

    it('auto-wraps content that has tags but no <speak> root', () => {
      const result = validateSsml('<break time="500ms"/>Hello', 'aws-polly');
      expect(result.warnings.some((w) => w.message.toLowerCase().includes('speak'))).toBe(true);
    });
  });

  describe('provider compatibility warnings', () => {
    it('warns when using phoneme with edge-tts', () => {
      const result = validateSsml(
        '<speak><phoneme alphabet="ipa" ph="təˈmeɪ.toʊ">tomato</phoneme></speak>',
        'edge-tts'
      );
      expect(result.warnings.some((w) => w.tag === 'phoneme')).toBe(true);
    });

    it('warns when using lang with gcp-tts', () => {
      const result = validateSsml(
        '<speak><lang xml:lang="fr-FR">Bonjour</lang></speak>',
        'gcp-tts'
      );
      expect(result.warnings.some((w) => w.tag === 'lang')).toBe(true);
    });

    it('does not warn for fully supported tags', () => {
      const result = validateSsml(
        '<speak><break time="500ms"/></speak>',
        'aws-polly'
      );
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('unknown tags', () => {
    it('warns (not errors) on unknown tags', () => {
      const result = validateSsml(
        '<speak><custom>text</custom></speak>',
        'aws-polly'
      );
      // Unknown tags are warnings, not errors (provider extensions)
      expect(result.warnings.some((w) => w.message.toLowerCase().includes('unknown'))).toBe(true);
      expect(result.valid).toBe(true);
    });
  });
});
