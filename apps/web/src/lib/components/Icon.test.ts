import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Verify the Icon component structurally — phosphor-svelte components
 * require full Svelte compilation to render in jsdom.
 */
describe('Icon component', () => {
  const source = readFileSync(join(__dirname, 'Icon.svelte'), 'utf-8');

  const requiredIcons = [
    'star', 'heart', 'pin', 'play', 'pause', 'filter',
    'chevron-down', 'chevron-right', 'export', 'x', 'plus',
    'check', 'arrow-left', 'trash', 'bookmark', 'search', 'speaker', 'sliders'
  ];

  for (const icon of requiredIcons) {
    it(`maps "${icon}" in the icon registry`, () => {
      // Icon names appear as object keys — may or may not be quoted
      const patterns = [
        `'${icon}'`,       // single-quoted key
        `"${icon}"`,       // double-quoted key  
        `${icon}:`,        // unquoted key
      ];
      const found = patterns.some((p) => source.includes(p));
      expect(found).toBe(true);
    });
  }

  it('imports from phosphor-svelte', () => {
    expect(source).toContain('phosphor-svelte');
  });

  it('exports name, size, and weight props', () => {
    expect(source).toContain('export let name');
    expect(source).toContain('export let size');
    expect(source).toContain('export let weight');
  });

  it('sets aria-hidden on the rendered SVG', () => {
    expect(source).toContain('aria-hidden');
  });

  it('handles filled variants', () => {
    expect(source).toContain('star-filled');
    expect(source).toContain('heart-filled');
    // The filled names resolve to 'fill' weight
    expect(source).toContain("'fill'");
  });
});
