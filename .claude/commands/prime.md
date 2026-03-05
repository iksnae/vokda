---
description: Quick-start agent orientation to the Vokda project
---

# Purpose

Orient an agent to Vokda — a voice discovery and curation app for TTS voices across cloud providers and open model ecosystems.

## Project Overview

Vokda is a SvelteKit 4 + TypeScript monorepo with AWS Amplify Gen2 backend (Cognito auth + AppSync/DynamoDB) and a lightweight Node.js admin API.

**Core user journey**: Browse → Audition → Curate (Collections/Cart) → Export (Voice Pack)

## Repository Structure

```
vokda/
├── apps/web/                 # SvelteKit frontend (static adapter)
│   ├── src/lib/              # Core library code
│   │   ├── types.ts          # All shared TypeScript types
│   │   ├── catalog.ts        # Catalog loader
│   │   ├── voice-catalog.ts  # Metadata patching, effective catalog
│   │   ├── voice-utils.ts    # SSML utils, variant warnings
│   │   ├── providers.ts      # Provider definitions
│   │   ├── auth/             # Cognito auth (store, config, types)
│   │   ├── data/             # Amplify Data layer (user-library, curation)
│   │   ├── stores/           # App state (cart, collections, favorites)
│   │   └── synthesis/        # Adapter registry + mock adapters
│   ├── src/routes/           # SvelteKit pages
│   └── static/data/          # voices.json seed catalog
├── apps/api/                 # Node.js admin API (user roles, synthesis gateway)
├── amplify/                  # Amplify Gen2 backend (auth + data schema)
├── packages/shared/          # Shared types placeholder
├── infra/                    # IaC placeholder
├── docs/                     # Architecture, roadmap, schema, API docs
├── PRD.md                    # Product requirements document
└── CLAUDE.md                 # Agent instructions (read this first)
```

## Key Commands

```bash
npm install                  # install deps
npm run dev:web              # SvelteKit dev server
npm run dev:api              # Admin API (port 8787)
npm run check:web            # typecheck (svelte-check)
npm run build:web            # production build
```

## Current State

Phase 1–2 of 4. Catalog browsing, search/filter, curation workspace, collections, cart, and voice pack export are functional. All synthesis adapters are mock implementations. No tests or linting configured yet.

## Engineering Constitutions

This project follows formal engineering constitutions that define professional standards:

- **TypeScript/JavaScript** (`docs/constitutions/ts/CONSTITUTION.md`): Primary constitution for all code. Key mandates:
  - `strict` mode mandatory, no `any` escape hatches, no floating promises
  - No swallowed errors, strict equality only, descriptive naming
  - Clean Architecture boundaries: domain is pure, adapters translate, dependency inversion
  - Review bar: types strict, errors handled, async structured, tests cover critical behavior
  - The Scribe's Oath: do no harm in code, no defect debt, proof with every release

- **Go** (`docs/constitutions/go/CONSTITUTION.md`): Reference for any future Go services.

Read the full constitutions before making architectural decisions or reviewing code.

## Workflow

1. Read `CLAUDE.md` for detailed agent instructions
2. Read the TS constitution (`docs/constitutions/ts/CONSTITUTION.md`) for engineering standards
3. Read `PRD.md` for product requirements
4. Check `docs/ARCHITECTURE.md` and `docs/ROADMAP.md` for context
5. Run `npm run check:web` to verify type safety after changes
6. Source code lives in `apps/web/src/` — start there for any feature work
