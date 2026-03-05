---
name: frontend-design
description: Design and build Vokda UI pages and components using SvelteKit 4, TypeScript, and component-scoped CSS. Covers page design, component patterns, responsive layout, and accessibility.
---

# Frontend Design: Vokda UI

## Purpose

Design and build browser-based UI for the Vokda voice discovery app using SvelteKit 4 with TypeScript and component-scoped CSS.

---

## Project-Specific Context

- **Framework**: SvelteKit 4 with TypeScript
- **Styling**: Component-scoped `<style>` blocks, CSS custom properties defined in `+layout.svelte`
- **Fonts**: Sora (Google Fonts, loaded via `<link>` in layout)
- **Adapter**: `@sveltejs/adapter-static` (prerendered)
- **State**: `svelte/store` (writable/derived) in `$lib/stores/app-state.ts`
- **Auth**: Role-based (visitor/guest/curator/admin) via `$lib/auth/store.ts`

### Design Tokens (from `+layout.svelte`)

```css
--bg-ink: #0f1b26;
--surface-0: #f2f6f9;
--surface-1: #f8fbfd;
--surface-2: #ffffff;
--stroke-soft: #d5e0e9;
--stroke-strong: #b6c8d6;
--brand-700: #0f5f7a;
--brand-600: #177089;
--brand-100: #dbeef5;
--accent-100: #fef0db;
--accent-700: #8f5a0b;
--radius-sm: 10px;
--radius-md: 16px;
--radius-lg: 24px;
--elev-1: 0 12px 24px rgba(15, 35, 54, 0.08);
--elev-2: 0 20px 42px rgba(13, 29, 45, 0.14);
```

### Existing UI Patterns

- **Cards**: White background, 1px border, 16-18px radius, subtle shadow, hover lift
- **Buttons**: Gradient brand buttons, `.ghost` outline variant
- **Pills/badges**: 999px radius, small font weight 620-760
- **Chips**: Colored by category (language=blue, tag=green, tone=amber)
- **Panels**: Section containers with border + radius + gradient background
- **Page animations**: `rise`/`reveal`/`cardIn` keyframes (opacity + translateY)

---

## Conventions

1. **Page structure**: `+page.ts` loads data, `+page.svelte` renders UI
2. **Reactive data**: Use `$:` for derived values, `$store` for store subscriptions
3. **Role gating**: Check `$roleFlags.isGuest`, `$roleFlags.isCurator`, `$roleFlags.isAdmin`
4. **Component props**: `export let data` for page data from load functions
5. **No shared CSS file**: All styles scoped in component `<style>` blocks
6. **Accessibility**: Use `aria-label`, `aria-pressed`, `disabled` attributes on interactive elements

## When Building New Pages

1. Create `+page.ts` with data loader (load catalog via `loadCatalog(fetch)`)
2. Create `+page.svelte` with typed `export let data`
3. Compute effective catalog: `$: effectiveVoices = buildEffectiveCatalog(data.voices, $metadataOverrides, $customVoices)`
4. Gate features by role using `$roleFlags`
5. Match existing visual patterns (card style, button variants, spacing)
6. Add page entry animation matching existing pages
7. Include `<svelte:head>` with page title

## Accessibility Checklist

- [ ] Semantic HTML (not div soup)
- [ ] ARIA labels on icon-only buttons
- [ ] Focus-visible outlines on interactive elements
- [ ] Disabled states for unauthorized actions
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Status messages use appropriate patterns
