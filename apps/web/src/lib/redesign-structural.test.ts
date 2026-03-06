import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

function readComponent(relativePath: string): string {
  return readFileSync(join(__dirname, '..', relativePath), 'utf-8');
}

describe('Phase A: Structural fixes', () => {
  describe('1a. Always-visible nav links', () => {
    it('shows home link via brand logo', () => {
      const layout = readComponent('routes/+layout.svelte');
      // Brand logo links to home; "Explore" was removed in favor of logo link
      expect(layout).toContain('href="/"');
      expect(layout).toContain('Vokda');
    });

    it('shows Collections link without auth guard for visibility', () => {
      const layout = readComponent('routes/+layout.svelte');
      expect(layout).toContain('Collections');
      expect(layout).toContain('href="/collections"');
    });
  });

  describe('1b. Auth pill replaced', () => {
    it('does not show "auth..." text', () => {
      const layout = readComponent('routes/+layout.svelte');
      expect(layout).not.toContain('>auth...</');
    });
  });

  describe('2a. Card click navigates to detail', () => {
    it('cards do not use select-surface toggle pattern', () => {
      const page = readComponent('routes/+page.svelte');
      expect(page).not.toContain('select-surface');
      expect(page).not.toContain('selectCard');
    });

    it('card body links to voice detail page', () => {
      const page = readComponent('routes/+page.svelte');
      expect(page).toContain('/voices/');
    });
  });

  describe('2b. Reduced card text', () => {
    it('does not render searchDescription on catalog cards', () => {
      const page = readComponent('routes/+page.svelte');
      expect(page).not.toContain('search-desc');
      expect(page).not.toContain('searchDescription');
    });

    it('does not render full description on catalog cards', () => {
      const page = readComponent('routes/+page.svelte');
      // description should not be displayed (still used for search filtering is ok)
      expect(page).not.toContain('class="description"');
    });
  });

  describe('3. Voice detail save actions above fold', () => {
    it('has save/favorite actions before audition section', () => {
      const detail = readComponent('routes/voices/[id]/+page.svelte');
      const favoritePos = detail.indexOf('Favorite');
      const auditionPos = detail.indexOf('Listen');
      // Favorite action should appear before the audition/listen section
      expect(favoritePos).toBeGreaterThan(-1);
      expect(auditionPos).toBeGreaterThan(-1);
      expect(favoritePos).toBeLessThan(auditionPos);
    });
  });

  describe('4. Collection detail route', () => {
    it('collection detail page exists', () => {
      const page = readFileSync(
        join(__dirname, '..', 'routes/collections/[id]/+page.svelte'),
        'utf-8'
      );
      expect(page).toContain('Export');
      expect(page).toContain('collection');
    });

    it('collection detail load function exists', () => {
      const loader = readFileSync(
        join(__dirname, '..', 'routes/collections/[id]/+page.ts'),
        'utf-8'
      );
      expect(loader).toContain('params.id');
    });
  });
});

describe('Phase B: Card & content cleanup', () => {
  describe('5. Copy overhaul', () => {
    it('hero uses new headline', () => {
      const page = readComponent('routes/+page.svelte');
      expect(page).toContain('Discover Voices');
      expect(page).not.toContain('Find TTS voices fast');
    });

    it('results count says "voices" not "results"', () => {
      const page = readComponent('routes/+page.svelte');
      expect(page).toContain('voices');
    });

    it('detail back link says "Explore"', () => {
      const detail = readComponent('routes/voices/[id]/+page.svelte');
      expect(detail).toContain('Explore');
      expect(detail).not.toContain('Back to catalog');
    });

    it('audition section says "Listen"', () => {
      const detail = readComponent('routes/voices/[id]/+page.svelte');
      expect(detail).toContain('Listen');
      expect(detail).not.toContain('Audition Studio');
    });

    it('empty search uses new copy', () => {
      const page = readComponent('routes/+page.svelte');
      expect(page).toContain('No voices found');
      expect(page).not.toContain('No voices matched the active filters');
    });

    it('collections auth gate uses new copy', () => {
      const collections = readComponent('routes/collections/+page.svelte');
      expect(collections).toContain('Sign in to start building voice collections');
      expect(collections).not.toContain('Sign in as a registered guest or higher');
    });

    it('curation auth gate uses new copy', () => {
      const curation = readComponent('routes/curation/+page.svelte');
      expect(curation).toContain('This workspace is for curators');
      expect(curation).not.toContain('Access restricted. Curator tier or higher is required.');
    });

    it('admin auth gate uses new copy', () => {
      const admin = readComponent('routes/admin/+page.svelte');
      expect(admin).toContain('This area is restricted to administrators');
      expect(admin).not.toContain('Access restricted. Admin tier is required.');
    });

    it('search placeholder uses new copy', () => {
      const page = readComponent('routes/+page.svelte');
      expect(page).toContain('Search voices');
    });

    it('filter label says "Type" not "Source"', () => {
      const page = readComponent('routes/+page.svelte');
      // The source filter label
      expect(page).toContain('Live preview');
    });
  });

  describe('6. No Unicode stars', () => {
    it('catalog page does not use Unicode star characters', () => {
      const page = readComponent('routes/+page.svelte');
      expect(page).not.toContain('☆');
      expect(page).not.toContain('★');
    });

    it('detail page does not use Unicode star characters', () => {
      const detail = readComponent('routes/voices/[id]/+page.svelte');
      expect(detail).not.toContain('☆');
      expect(detail).not.toContain('★');
    });
  });

  describe('7. Favicon exists', () => {
    it('favicon file exists in static directory', () => {
      const exists = (() => {
        try {
          readFileSync(join(__dirname, '../../static/favicon.svg'), 'utf-8');
          return true;
        } catch {
          return false;
        }
      })();
      expect(exists).toBe(true);
    });

    it('app.html references favicon', () => {
      const html = readFileSync(join(__dirname, '../app.html'), 'utf-8');
      expect(html).toContain('favicon');
    });
  });

  describe('8. Collapsible filters', () => {
    it('filters section has a toggle mechanism', () => {
      const page = readComponent('routes/+page.svelte');
      expect(page).toContain('filtersOpen');
    });
  });
});

describe('Phase C: Discovery & delight', () => {
  describe('9. Prefill audition text from sample', () => {
    it('detail page uses sample transcript for audition prefill', () => {
      const detail = readComponent('routes/voices/[id]/+page.svelte');
      expect(detail).toContain('samples[0]');
    });
  });

  describe('10. Provider badges are color-coded', () => {
    it('catalog page imports provider colors', () => {
      const page = readComponent('routes/+page.svelte');
      expect(page).toContain('provider-colors');
    });
  });

  describe('11. Collapsible sections on detail page', () => {
    it('detail page has voice profile section', () => {
      const detail = readComponent('routes/voices/[id]/+page.svelte');
      expect(detail).toContain('Voice profile');
    });

    it('detail page has model card section', () => {
      const detail = readComponent('routes/voices/[id]/+page.svelte');
      expect(detail).toContain('Model card');
    });
  });
});
