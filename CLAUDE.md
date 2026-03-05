# Vokda — Agent Instructions

Voice discovery and curation app for TTS voices across cloud providers and open model ecosystems.

## Project Overview

- **Stack**: SvelteKit 4 (TypeScript) + AWS Amplify Gen2 (Cognito auth, AppSync/DynamoDB data) + Node.js admin API
- **Repo**: Monorepo with `apps/web`, `apps/api`, `packages/shared`, `amplify/`, `infra/`
- **Org**: `iksnae` on GitHub (private)
- **Hosting**: AWS Amplify (frontend), preview envs from PR branches, production from `main`

## Key Commands

```bash
npm install                  # install all workspace deps
npm run dev:web              # SvelteKit dev server
npm run dev:api              # Node.js admin API (port 8787)
npm run check:web            # svelte-check + typecheck
npm run build:web            # production build (static adapter)
npm run lint                 # (not yet configured)
npm run test                 # (not yet configured)
```

## Architecture

- **Frontend** (`apps/web`): SvelteKit with static adapter, prerendered pages
- **Catalog data**: `apps/web/static/data/voices.json` (12 seed voices across 6 providers)
- **Auth**: Cognito user pools via `aws-amplify`, role hierarchy: visitor → guest → curator → admin
- **Data layer**: Amplify Data (AppSync + DynamoDB) for favorites, collections, cart, curation workspace
- **API** (`apps/api`): Vanilla Node.js HTTP server for admin user role management and synthesis preview gateway
- **Synthesis**: Adapter registry pattern — all adapters are currently mock implementations

## Code Conventions

- TypeScript strict mode, no `any` unless absolutely necessary
- Svelte 4 component style: `export let data` for page props, `$:` reactive statements
- Stores use `svelte/store` writable/derived pattern
- Use `import { get } from 'svelte/store'` for synchronous snapshots (not subscribe/unsubscribe trick)
- CSS is component-scoped in `<style>` blocks (no global CSS framework)
- IDs use ULIDs for voices/variants/samples
- Dates stored as ISO 8601 strings
- Amplify Data models use `createdAtIso`/`updatedAtIso` string fields (not Amplify auto-timestamps)

## File Map

```
apps/web/src/
  lib/
    types.ts                  # All shared TypeScript types
    catalog.ts                # Catalog loader (fetches voices.json)
    voice-catalog.ts          # Metadata patching, effective catalog builder, voice draft creation
    voice-utils.ts            # SSML stripping, variant warnings, text truncation
    providers.ts              # Provider definitions and normalization
    auth/                     # Amplify Cognito auth (store, config, types, client)
    data/                     # Amplify Data layer (user-library, curation-workspace, client)
    stores/app-state.ts       # Central app state (cart, collections, favorites, curation, providers)
    synthesis/                # Synthesis adapter registry, service, constraints, mock adapters
  routes/
    +layout.svelte            # App shell (header, nav, auth controls)
    +page.svelte              # Home — catalog browse/search/filter with voice cards
    voices/[id]/              # Voice detail — audition studio, samples, variants, cart/collection
    cart/                     # Cart — line items, warnings, voice pack export
    collections/              # Collections management
    curation/                 # Curator workspace — metadata editor, voice draft creation
    admin/                    # Admin — user role management, provider CRUD
    account/                  # Sign in / sign up / email verification
amplify/
  auth/resource.ts            # Cognito config (email login, groups: guest/curator/admin)
  data/resource.ts            # AppSync schema (Favorite, Collection, CollectionVoice, CartItem, CurationWorkspace, etc.)
  backend.ts                  # Amplify backend definition
apps/api/src/server.mjs       # Admin API (Cognito JWT verify, user lookup, role management, synthesis preview)
```

## Current State (as of March 2026)

- **Phase 1–2 of 4**: Catalog UX + Curation/Cart implemented
- **Working**: Browse, search, filter, voice detail, audition studio (mock), cart, voice pack export, collections, favorites, curation workspace, admin role management, auth (sign up/in/confirm)
- **Scaffolded but mock**: All 6 synthesis adapters (aws-polly, azure-speech, gcp-tts, elevenlabs, huggingface, self-hosted)
- **Missing**: OpenAI adapter in registry, real synthesis implementations, ingestion pipelines, tests, linting
- **Known issues**: Every page loads full catalog; `collectionMessage` shared across cards; no Cart link in nav header

## Constitutions

This project follows engineering constitutions that define professional standards, naming, architecture, and review expectations:

- **TypeScript/JavaScript**: `docs/constitutions/ts/CONSTITUTION.md` — Primary constitution for all frontend and API code. Covers strict TypeScript policy, Clean Architecture boundaries, naming conventions, error handling, async discipline, and the Scribe's Oath.
- **Go**: `docs/constitutions/go/CONSTITUTION.md` — Reference constitution for any future Go services. Covers error handling, concurrency, testing, and module architecture.

**Key mandates from the TS constitution that apply to this codebase:**

- `strict` mode is mandatory — never disable strict-family flags without documented justification
- No `any` as an escape hatch — use `unknown` and narrow with type guards for untrusted data
- No floating promises — every promise must be awaited, returned, or intentionally handled
- No swallowed errors — empty `catch` blocks are forbidden; handle or log meaningfully
- Strict equality (`===`) only — no loose equality without a written reason
- Names are descriptive to a new reader — no ambiguous abbreviations
- External inputs validated at runtime — TypeScript types don't protect runtime
- Small, frequent releases — don't block others with giant merges
- Review checklist: types strict, errors handled, async structured, names communicate intent, tests cover critical behavior

## Rules

- Never commit `.env` files or secrets
- Never modify `amplify_outputs.json` directly — it's generated by `ampx`
- Don't modify files under `.svelte-kit/`, `build/`, `.amplify/artifacts/`, or `node_modules/`
- Keep voice catalog data in `apps/web/static/data/voices.json` (source of truth for seed data)
- Auth mode is configurable via `PUBLIC_AUTH_MODE` env var (`amplify` or `mock`)
- Synthesis mode is configurable via `PUBLIC_SYNTH_MODE` env var (`mock` or `gateway`)
- Always run `npm run check:web` after making changes to verify no type errors
