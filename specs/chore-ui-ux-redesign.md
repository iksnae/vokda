# UI/UX Redesign Plan — "Pinterest for Voices"

## Report

**Date of completion:** March 5, 2026

**Summary:** Implemented Phases A–C of the UI/UX redesign, transforming Vokda from a cart-centric flow to a collection-first, Pinterest-style discovery experience.

### What was implemented

**Phase A — Structural fixes:**
1. **Always-visible nav** — "Explore" and "Collections" links are now visible to all visitors (not gated behind auth). Collections shows a count badge when populated. Auth pill replaced with avatar circle (skeleton during loading).
2. **Card click → navigate** — Removed the `select-surface` toggle pattern. Clicking a card body navigates directly to the voice detail page.
3. **Pin button popover** — Cards now have heart (favorite) and pin (collection) icon buttons. Pin opens a Pinterest-style board-picker popover with checkboxes and "Create new" inline input.
4. **Save actions above fold** — Voice detail page now shows Favorite and "Add to collection" buttons in the profile header, before the audition section.
5. **Collection detail page** — New route `/collections/[id]` with voice card grid, per-voice notes, export button, and remove actions.
6. **Collection export** — `buildVoicePack()` wired to Export button on collection detail page, downloading a named JSON voice pack.

**Phase B — Card & content cleanup:**
7. **Reduced card density** — Removed `description`, `searchDescription`, and meta line from cards. Cards now show: play button → name → shortLabel → provider badge · language · tier → 3-4 chips → save actions.
8. **Full copy overhaul** — All 18+ copy changes from the spec table implemented across catalog, detail, collections, curation, and admin pages.
9. **Toast notification system** — Replaced shared `collectionMessage` string with a proper `toast-store.ts` + `Toast.svelte` component. All save/pin/delete actions now use transient toast notifications.
10. **Phosphor icon component** — Created `Icon.svelte` wrapper around `phosphor-svelte@2.0.1` (Svelte 4 compatible). Replaced all Unicode star characters (☆/★) with proper Phosphor SVG icons (Star, Heart, PushPin, Play, Funnel, etc.). 18 icon types mapped.
11. **Favicon** — Created `favicon.svg` with brand gradient V mark, referenced in `app.html`.
12. **Collapsible filters** — Filters collapsed by default behind a "Filters" toggle button with active filter count badge. Search bar remains always-visible.

**Phase C — Discovery & delight:**
13. **Inline play button** — Cards now have a prominent circular play button in the hero area (placeholder until synthesis is implemented).
14. **Prefill audition text** — Voice detail audition textarea auto-fills with the first sample transcript.
15. **Color-coded provider badges** — New `provider-colors.ts` module assigns distinct color schemes per provider (AWS=orange, Azure=blue, Google=green, ElevenLabs=purple, HuggingFace=yellow, OpenAI=dark). Applied on catalog cards, detail page, and collection views.
16. **Card height normalization** — Cards use consistent grid-template-rows and capped chip counts (max 3 tags + 1 tone).
17. **Collapsible detail sections** — "About this voice" and "Technical details" are now collapsible sections with toggle buttons (collapsed by default).

**Phase D — Partially scaffolded:**
- Collection cards with mini voice avatars (implemented in collections list)
- Anonymous visitor experience (shows onboarding prompt, not blank wall)

### Testing

- **66 tests** across 4 test files, all passing
- `Icon.test.ts` — 22 tests verifying icon registry completeness and Phosphor integration
- `Toast.test.ts` — 7 tests for toast store CRUD operations
- `provider-colors.test.ts` — 8 tests for color scheme mapping and normalization
- `redesign-structural.test.ts` — 29 tests verifying structural changes across all phases (nav links, card structure, copy changes, route existence, collapsible sections)
- **Type checking:** 0 errors, 0 warnings (`svelte-check`)
- **Build:** Successful production build with static adapter

### Issues encountered and resolutions

1. **phosphor-svelte v3 uses Svelte 5 runes** — Resolved by installing v2.0.1 which uses Svelte 4 `export let` syntax.
2. **Import paths for phosphor-svelte** — Deep imports like `phosphor-svelte/lib/Star/Star.svelte` lack type declarations. Resolved by importing from directory index: `phosphor-svelte/lib/Star`.
3. **Missing `slide` transition import** — Added `import { slide } from 'svelte/transition'` to pages using `transition:slide`.
4. **Prerender error for `/collections/[id]`** — Dynamic route can't be statically prerendered. Added `export const prerender = false`.
5. **A11y warnings on popover divs** — Added svelte-ignore comments for `on:click|stopPropagation` on popover containers (intentional event boundary). Replaced `<h1 on:click>` with nested button for collection name editing.

### Refactoring performed

- **Extracted reusable modules:** `Icon.svelte`, `toast-store.ts`, `Toast.svelte`, `provider-colors.ts`
- **Established type scale:** CSS custom properties `--text-display`, `--text-heading`, `--text-subhead`, `--text-body`, `--text-small`, `--text-xs` for consistent typography
- **Global focus rings:** Added `*:focus-visible` rule in layout for accessibility
- **Set up vitest:** Configured `vitest.config.ts` with jsdom environment and SvelteKit alias mocks; updated package.json test script

### Files changed/created

**New files:**
- `apps/web/src/lib/components/Icon.svelte` — Phosphor icon wrapper
- `apps/web/src/lib/components/Toast.svelte` — Toast notification UI
- `apps/web/src/lib/components/toast-store.ts` — Toast state management
- `apps/web/src/lib/provider-colors.ts` — Provider color scheme registry
- `apps/web/src/routes/collections/[id]/+page.svelte` — Collection detail page
- `apps/web/src/routes/collections/[id]/+page.ts` — Collection detail loader
- `apps/web/static/favicon.svg` — Brand gradient V mark favicon
- `apps/web/vitest.config.ts` — Vitest configuration
- `apps/web/src/test-mocks/app-environment.ts` — SvelteKit mock for tests
- `apps/web/src/test-mocks/app-navigation.ts` — SvelteKit mock for tests
- `apps/web/src/lib/components/Icon.test.ts` — Icon component tests
- `apps/web/src/lib/components/Toast.test.ts` — Toast store tests
- `apps/web/src/lib/provider-colors.test.ts` — Provider colors tests
- `apps/web/src/lib/redesign-structural.test.ts` — Structural verification tests

**Modified files:**
- `apps/web/src/routes/+layout.svelte` — Always-visible nav, avatar, toast container
- `apps/web/src/routes/+page.svelte` — Redesigned catalog with Pinterest-style cards
- `apps/web/src/routes/voices/[id]/+page.svelte` — Restructured detail with save-above-fold
- `apps/web/src/routes/collections/+page.svelte` — Visual collection cards
- `apps/web/src/routes/curation/+page.svelte` — Updated auth gate copy
- `apps/web/src/routes/admin/+page.svelte` — Updated auth gate copy
- `apps/web/src/app.html` — Favicon link
- `apps/web/package.json` — Added test scripts, phosphor-svelte dependency

---

## Design Philosophy

Vokda is **Pinterest for voices** — a discovery-first experience where users browse, listen, and curate voices into collections they can export. The core loop is:

**Discover → Listen → Pin → Organize → Export**

Every design decision should optimize for fast scanning, effortless saving, and the dopamine of building a great voice set.

---

## Current State Assessment

### What works
- Soft gradient palette and frosted-glass header feel premium
- Card grid layout is appropriate for browse-and-scan
- Search covers a wide field (name, tags, tone, use case)
- Filter set is comprehensive
- Voice detail page has good bones (profile, audition, samples, variants)

### What doesn't work

**Mental model mismatch.** The app was built around a cart/checkout flow. With cart removed, the UX needs to pivot fully toward collection-centric discovery. Right now:

- Anonymous visitors see **zero navigation** — no way to discover that collections, curation, or export exist
- The card-click interaction opens a **collection picker panel** (hidden affordance), not the voice detail
- Cards display **7+ distinct text blocks** — two overlapping descriptions, chips for language/tags/tone, and a meta line — all competing for attention
- The voice detail page has **no prominent "save to collection" action** above the fold
- Collections page is a **bare CRUD form** with no visual identity, no voice previews, no export
- Empty states are ghost-gray walls with jargon-heavy copy

**Navigation dead ends.** No persistent Collections link for visitors. No way back to catalog from collections. No cross-linking between voices and collections.

---

## Design Principles

1. **Scan, don't read.** Users should identify a voice's character in <2 seconds from card alone.
2. **One-tap save.** Pinning a voice to a collection should be frictionless — like Pinterest's board picker.
3. **Listen-first.** Audio preview should be the most prominent interaction, not buried under text.
4. **Collections are the product.** They deserve rich presentation, not a form view.
5. **Progressive disclosure.** Show identity first, details on demand.

---

## Changes by Area

### 1. Navigation & Shell

#### 1a. Always-visible nav links
**Now:** Nav is empty for anonymous visitors. Collections/Starred only appear after auth as guest+.
**Target:** Show "Explore" and "Collections" links always. Show count badges when populated. Gate write-actions behind auth, not visibility.

```
[V] Vokda          Explore    Collections (3)    [Sign in]
```

- "Explore" links to `/` (catalog)
- "Collections" links to `/collections` — anonymous users see public/featured collections or an onboarding prompt, not a blank wall
- Starred moves into collections as a built-in "Favorites" collection

#### 1b. Kill the "auth..." pill
Replace with a skeleton circle or hide entirely until resolved. After auth, show user initial avatar or a clean role icon.

#### 1c. Add favicon
Create a simple `V` mark favicon matching the brand gradient.

---

### 2. Catalog Home — Voice Cards

#### 2a. Reduce card text to scannable essentials
**Now:** Provider, tier, star, name, shortLabel, description, searchDescription, language chips, tag chips, tone chips, meta line.
**Target:** Tighten to a Pinterest-style pin:

```
┌──────────────────────────────┐
│  ▶  (play sample inline)     │  ← audio is hero
│  ─────────────────────────── │
│  Joanna                      │  ← name
│  Warm US narrator             │  ← shortLabel only
│  AWS Polly · en-US · premium │  ← compact meta line
│  [narration] [warm]          │  ← max 3-4 chips
│                    [♡] [Pin] │  ← save actions
└──────────────────────────────┘
```

**Specific removals:**
- `description` — redundant with `shortLabel`; keep for detail page only
- `searchDescription` — search-index-only, never render
- Tone chips — merge into tag chips (pick the most distinctive 1)
- Meta line "1 variants · 1 samples · runnable" — replace with small icons/badges

#### 2b. Replace card-click toggle with direct navigation
**Now:** Clicking the card body opens an inline collection panel (hidden affordance via `select-surface` button). "View" link is secondary.
**Target:** Clicking the card navigates to voice detail. Save/pin action is a dedicated button on the card that opens a lightweight board-picker popover (Pinterest-style).

#### 2c. Inline play button on cards
Add a small play/pause button that plays the voice's first sample audio (when available) without leaving the catalog. This is the #1 discovery action.

#### 2d. Pin button (collection quick-save)
Replace the disabled "Save" button with a pin/bookmark icon button that:
- If signed in with collections: opens a small popover listing collections with checkboxes + "Create new" input
- If signed in with no collections: creates a default "Saved" collection and pins immediately
- If not signed in: shows a tooltip "Sign in to save voices"

#### 2e. Fix `collectionMessage` shared state
Each card needs its own message state. Either scope the message to the card's `voice.id` via a `Map<string, string>` or use a transient toast notification system.

#### 2f. Replace Unicode stars with icon component
Per constitution Article X, replace `☆`/`★` characters with a proper SVG icon (star outline/fill). Inline SVG is acceptable since Phosphor Vue won't work in Svelte — create a reusable `<Icon>` component with a small SVG sprite.

#### 2g. Collapsible filters
**Now:** Filters always visible, 6-column grid eating vertical space.
**Target:** Collapsed by default with a "Filters" toggle button showing active filter count. Search bar stays always-visible in hero.

---

### 3. Voice Detail Page

#### 3a. Restructure information hierarchy
**Now:** Profile → Audition → Samples → Variants → Save to Collection
**Target:** Profile + Save action → Audition (hero position) → About (collapsed) → Variants (technical, collapsed for most users)

Layout concept:
```
┌─────────────────────────────────────────────┐
│  ← Back to explore                          │
│                                             │
│  AWS POLLY · premium                        │
│  Joanna                                     │
│  Warm US narrator                           │
│  [narration] [assistant] [warm]             │
│                                             │
│  [♡ Favorite]  [Pin to collection ▼]        │  ← primary actions
│                                             │
├─────────────────────────────────────────────┤
│  ▶ AUDITION                                 │
│  ┌─────────────────────────────────────┐    │
│  │ "This release adds multilingual..." │    │  ← prefill with sample transcript
│  └─────────────────────────────────────┘    │
│  [▶ Play]  [Plain text ○ SSML]              │
├─────────────────────────────────────────────┤
│  ▸ About this voice                         │  ← collapsible
│    Description, license, use cases          │
│  ▸ Technical details                        │  ← collapsible
│    Variants, formats, SSML support, limits  │
└─────────────────────────────────────────────┘
```

#### 3b. Move save actions above the fold
**Now:** "Save To Collection" is the last section, below Variants.
**Target:** Pin/save actions in the profile header area, immediately visible.

#### 3c. Prefill audition text from sample transcript
**Now:** Generic placeholder text.
**Target:** Default to the voice's first sample transcript so users hear representative content immediately.

#### 3d. Remove dual descriptions
Show only `shortLabel` in the header. Move `description` into the "About" collapsible. Never render `searchDescription`.

#### 3e. "Back to catalog" → "Back to explore"
Align with nav language.

---

### 4. Collections Page — The Core Product

This page needs the most work. It should feel like Pinterest boards, not a database admin form.

#### 4a. Collection cards with visual identity
**Now:** Flat form with "Add voice" dropdowns and textarea notes.
**Target:** Each collection is a visual card showing:

```
┌──────────────────────────────┐
│  Documentary Narrators       │
│  4 voices                    │
│  ┌────┐ ┌────┐ ┌────┐       │  ← mini voice avatars/chips
│  │ Jo │ │ Ma │ │ on │ +1    │
│  └────┘ └────┘ └────┘       │
│                              │
│  [Open]          [Export ↓]  │
└──────────────────────────────┘
```

#### 4b. Collection detail view
Clicking "Open" on a collection navigates to `/collections/[id]` showing:
- Collection name + description (editable)
- Grid of voice cards (same component as catalog, but with remove button and note field)
- Export button that downloads a Voice Pack for this collection
- Share link (future)

#### 4c. Export lives on collections, not cart
The `buildVoicePack()` function (already refactored) gets wired to an "Export collection" button on each collection's detail page. The exported file is named after the collection.

#### 4d. Default "Favorites" collection
Instead of a separate favorites system, treat favorites as a built-in collection that can't be deleted. Simplifies the mental model — everything is a collection.

#### 4e. Anonymous visitor experience
Show featured/public collections (admin-curated) as inspiration. Prompt: "Sign in to start building your own voice collections."

---

### 5. Copy & Messaging Overhaul

| Location | Current | Proposed |
|----------|---------|----------|
| Hero headline | "Find TTS voices fast" | "Discover voices for every project" |
| Hero subtitle | "Search by voice name, tone, language, or use case." | "Browse TTS voices across providers, listen instantly, and build your perfect voice set." |
| Search placeholder | "Search voices..." | "Search by name, style, or use case..." |
| Filter: "Source" | "Source" / "Cloud" / "HF Model" | "Type" / "Cloud provider" / "Open model" |
| Filter: "Runnable" | "Runnable" | "Live preview" |
| Card: "View" button | "View" | "Details" or just make the card itself clickable |
| Card: "Save" button | "Save" (disabled, no explanation) | Pin icon with tooltip |
| Detail: "Back to catalog" | "Back to catalog" | "← Explore" |
| Detail: "Audition Studio" | "Audition Studio" | "Listen" |
| Detail: "Save To Collection" | "Save To Collection" | "Add to collection" (moved to header) |
| Detail: "Add to favorites" | "Add to favorites" | "♡ Favorite" (toggle) |
| Detail: "Curator note" | "Curator note" | "Your notes" |
| Detail: auth gate | "Sign in as a registered guest or higher to save favorites and collections." | "Sign in to save and organize voices." |
| Collections: auth gate | "Sign in as a registered guest or higher to save and manage collections." | "Sign in to start building voice collections." |
| Curation: auth gate | "Access restricted. Curator tier or higher is required." | "This workspace is for curators. Sign in with a curator account to continue." |
| Admin: auth gate | "Access restricted. Admin tier is required." | "This area is restricted to administrators." |
| Empty collections | "No collections yet. Create one and start curating." | "Your collections will appear here. Pin voices from the catalog to get started." |
| Empty search | "No voices matched the active filters." | "No voices found. Try different filters or search terms." |
| Results count | "12 results" | "12 voices" |
| Badge: "premium" / "standard" | Raw tier label | Keep, but add tooltip explaining tier meaning |

---

### 6. Visual Polish & Consistency

#### 6a. Color-coded provider badges
Assign each provider a subtle brand-tinted badge color (AWS=orange, Azure=blue, Google=green, ElevenLabs=purple, HF=yellow, OpenAI=dark). Improves scannability.

#### 6b. Card height consistency
Normalize card heights in the grid by capping visible text and using consistent chip counts. Cards with 10 language chips (Qwen3) shouldn't be 2x taller than others.

#### 6c. Typography scale
Current: `clamp(1.7rem, 3.2vw, 2.4rem)` for hero h1, inconsistent sizes elsewhere.
Target: Establish a 4-step type scale: display (hero), heading (section), subhead (card name), body. Apply consistently.

#### 6d. Interaction feedback
- Add hover/active states to all interactive elements
- Add a lightweight toast system for save/pin confirmations (replace per-card flash messages)
- Loading skeletons for async states instead of text flashes

#### 6e. Focus and accessibility
- Visible focus rings on all interactive elements (many are missing)
- Ensure sufficient color contrast on Collections/Curation pages (currently ghost-gray on light bg)
- ARIA labels for icon-only buttons

---

### 7. Mobile Refinements

#### 7a. Bottom action bar
On mobile, pin/save actions should appear as a sticky bottom bar on voice detail pages — not buried at the bottom of the page.

#### 7b. Compact filter sheet
Instead of stacking 6 filters vertically (pushes first card below fold), use a slide-up filter sheet triggered by a "Filter" button.

#### 7c. Swipe-friendly collection management
In collection detail, allow drag-to-reorder and swipe-to-remove gestures (future, but design for it).

---

## Implementation Priority

### Phase A — Structural fixes (unblock the collection-first flow)
1. Always-visible nav with Explore + Collections links
2. Card click → navigate to detail (remove select-surface toggle)
3. Pin button popover on cards (replace Save + inline collection panel)
4. Move save-to-collection above the fold on detail page
5. Collection detail page (`/collections/[id]`) with voice grid + export button
6. Wire `buildVoicePack()` to collection export

### Phase B — Card & content cleanup
7. Reduce card text density (remove description + searchDescription from cards)
8. Copy overhaul (all messaging changes from table above)
9. Fix collectionMessage shared state (use toast system)
10. Replace Unicode stars with SVG icon component
11. Add favicon
12. Collapsible filters

### Phase C — Discovery & delight
13. Inline audio play button on cards
14. Prefill audition text from sample transcript
15. Color-coded provider badges
16. Card height normalization
17. Loading skeletons and interaction feedback
18. Collapsible sections on detail page (About, Technical)

### Phase D — Collections as product
19. Collection cards with voice mini-avatars
20. Default "Favorites" collection (merge favorites into collections)
21. Anonymous visitor experience (featured collections)
22. Mobile bottom action bar
23. Compact mobile filter sheet

---

## Out of Scope (for now)
- Real audio playback (requires synthesis implementation)
- Share collection links (requires backend changes)
- Drag-to-reorder in collections
- Social features (like/follow collections)
- PWA / offline support
