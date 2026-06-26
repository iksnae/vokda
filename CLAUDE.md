# Vokda — Agent Instructions

**Vokda is the central destination for everything TTS** — voice discovery and curation (Pinterest for voices) plus an industry hub tracking new models, news, reviews, and guidance.

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/VISION.md](./docs/VISION.md) | Product vision |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | What's planned and what's active |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture, components, data flow |
| [docs/SCHEMA.md](./docs/SCHEMA.md) | All data models (catalog, Amplify, API) |
| [docs/DISCOVERY.md](./docs/DISCOVERY.md) | User guide — browse, search, SSML, collections, clips |
| [docs/SYNTHESIS_API.md](./docs/SYNTHESIS_API.md) | API reference — endpoints, auth, providers, examples |
| [docs/API.md](./docs/API.md) | API index (links to above) |

## Project Overview

- **Stack**: SvelteKit 4 (TypeScript) + AWS Amplify Gen2 (Cognito auth, AppSync/DynamoDB) + Serverless Synthesis API (SAM)
- **Repo**: npm-workspaces monorepo — `apps/web`, `apps/api`, `packages/sdk` (TS SDK), plus `amplify/`, `infra/`, `scripts/` (catalog generators), `specs/` (plans)
- **Org**: `iksnae` on GitHub (private)
- **Live**: https://vokda.iknsae.com
- **API**: https://api.vokda.iksnae.com
- **Hosting**: AWS Amplify (frontend), SAM stack (API), production from `main`

## Key Commands

```bash
npm install                  # install all workspace deps (npm workspaces; Node >=20)
npm run dev:web              # SvelteKit dev server
npm run dev:api              # Node.js admin API (port 8787)
npm run check:web            # svelte-check + typecheck (CI gate)
npm run build:web            # runs publish-catalog.mjs, then production build (static adapter)
npm run test                 # run unit tests (235 tests, vitest) — delegates to apps/web
npm -w apps/web run test:watch   # vitest watch mode
npm -w apps/web run test -- serialize   # run a single test file by name match
npm run lint                 # NOTE: currently a no-op stub ("No lint configured yet")

# SDK package (packages/sdk)
npm run build:sdk            # build the TS SDK
npm run check:sdk            # typecheck the SDK

# Catalog regeneration (see "Catalog publish" below)
node scripts/publish-catalog.mjs     # regenerate static catalog JSON from voices.json
npm run generate:api                 # regenerate API catalog artifacts (generate-api-catalog.mjs)

# Synthesis API (infra/)
cd infra && sam build && sam deploy   # deploy Lambda + API Gateway

# Amplify backend (wraps AWS profile switch via switch-aws-env.sh personal)
npm run amplify:sandbox      # local sandbox + generate amplify_outputs.json
npm run amplify:deploy       # pipeline-deploy --branch main
npm run amplify:outputs      # regenerate amplify_outputs.json
```

### Catalog publish

`apps/web/static/data/voices.json` is the source of truth. After editing it you **must** regenerate the derived artifacts and commit them, or the live site/API will serve stale data: `build:web` runs `publish-catalog.mjs` automatically, and `npm run generate:api` rebuilds the API catalog. Hosting is AWS Amplify (auto CloudFront invalidation on deploy). The live Synthesis API is the SAM stack `vokda-synthesis-dev` **in the `personal` AWS account (997901679385)** — `samconfig.toml` pins `profile = "personal"` so `sam deploy` targets production. ⚠️ A dead identically-named duplicate stack exists in account 471112983933 (API `ko0s1wact2`); never deploy there. Production API id is `zmmvxu8uyh` → `api.vokda.iksnae.com`.

### CI

Single workflow `.github/workflows/ci.yml` (`web-checks` job) runs on push to `main` and on PRs: `npm run check:web` then `npm run build:web` on Node 20. Always run `check:web` locally before pushing.

## Architecture

- **Frontend** (`apps/web`): SvelteKit 4 with static adapter, 550 voices across 25 providers
- **Catalog data**: `apps/web/static/data/voices.json` — source of truth (550 voices, 53 languages)
- **Auth**: Cognito user pools via `aws-amplify`, role hierarchy: visitor → guest → curator → admin
- **Data layer**: Amplify Data (AppSync + 10 DynamoDB tables) for favorites, collections, credentials, clips
- **Synthesis API** (`infra/`): SAM-deployed Lambda with 9 provider adapters, API key auth, S3 audio storage
- **Admin API** (`apps/api`): Node.js HTTP server for user role management

## Code Conventions

- TypeScript strict mode, no `any` unless absolutely necessary
- Svelte 4 component style: `export let data` for page props, `$:` reactive statements
- Stores use `svelte/store` writable/derived pattern
- Use `import { get } from 'svelte/store'` for synchronous snapshots
- CSS is component-scoped in `<style>` blocks (no global CSS framework)
- IDs use ULIDs for voices/variants/samples
- Dates stored as ISO 8601 strings
- Amplify Data models use `createdAtIso`/`updatedAtIso` string fields

## File Map

```
apps/web/src/
  lib/
    types.ts                  # All shared TypeScript types
    catalog.ts                # Catalog loader (fetches voices.json)
    voice-catalog.ts          # Metadata patching, effective catalog builder
    voice-utils.ts            # SSML stripping, variant warnings, text truncation
    providers.ts              # Provider definitions and normalization
    provider-catalog.ts       # Per-provider aggregation (counts, languages, SSML, pricing)
    similar-voices.ts         # "Similar voices" scorer (language/gender/age/quality/tags)
    auth/                     # Amplify Cognito auth (store, config, client)
    data/                     # Amplify Data layer (user-library, credentials, client)
    stores/
      app-state.ts            # Collections, favorites, curation state
      clips.ts                # API-backed clip store (fetch from /v1/jobs)
      credentials.ts          # Provider credential management
    synthesis/
      service.ts              # Orchestrates synthesis (API mode, gateway, browser)
      registry.ts             # Adapter registry, provider detection
      constraints.ts          # Input normalization
      types.ts                # SynthesisRequest (incl. instructions), SynthesisPreview
      provider-steering.ts    # Steerability capability, voice/model-aware (OpenAI instructions · ElevenLabs settings+v3 tags · Polly newscaster)
      credential-status.ts    # Credential validity label (verified/unverified/invalid)
      adapters/               # 9 real + mock adapters per provider
    ssml/
      tags.ts                 # Tag registry (7 tags, 4 providers)
      validate.ts             # DOMParser-based SSML validation
      serialize.ts            # wrapSpeak, insertTag with cursor positioning
    components/
      Icon.svelte             # Icon wrapper (20+ icons)
      SsmlEditor.svelte       # Composite SSML editor
      SsmlToolbar.svelte      # Tag buttons with attribute popovers
      ProviderSetupGuide.svelte # Provider setup guidance
  routes/
    +layout.svelte            # App shell (header, nav, auth)
    +page.svelte              # Home — catalog browse/search/filter (11 filters, URL-synced)
    voices/[id]/              # Voice detail — audition (+ steerability "Direction"), SSML editor, similar voices
    providers/[id]/           # Per-provider page — counts, pricing, voice gallery
    collections/              # Collections management
    curation/                 # Curator workspace (curator+)
    admin/                    # Admin panel (admin only)
    account/                  # Sign in/up, provider keys, API keys, clips
amplify/
  auth/resource.ts            # Cognito config (groups: guest/curator/admin)
  data/resource.ts            # AppSync schema (10 models)
  backend.ts                  # Amplify backend definition
infra/
  template.yaml               # SAM template (3 Lambdas, API Gateway, SQS, DynamoDB)
  build.sh                    # Pre-build script (copies voices.json into Lambda)
  functions/
    synthesis-router/
      index.mjs               # Router: auth + endpoints (incl. POST /v1/synthesize/batch)
      lib/adapters/            # 9 provider adapters (openai, elevenlabs, etc.)
      lib/providers.mjs        # Provider catalog + enabled filtering
      lib/voices.mjs           # Voice catalog loader + query filtering (+ steering field)
      lib/steering.mjs         # Server-side steering capability resolver (mirrors web)
      lib/batch.mjs            # Batch synthesis item validation
      lib/audio-duration.mjs   # durationMs from rendered MP3/WAV
      lib/jobs.mjs             # SynthesisJob CRUD
      lib/keys.mjs             # API key management
      lib/credentials.mjs      # BYOK credential CRUD
      data/voices.json         # Voice catalog (build artifact, copied by build.sh)
    synthesis-worker/          # Async SQS worker
    auth-authorizer/           # JWT + API key validator
apps/api/src/server.mjs       # Admin API (role management)
```

## Current State (as of June 2026)

**Shipped:**
- 550 voices across 25 providers, 100% with audio samples, 53 languages
- Pinterest-style browse grid with 11 filters (provider, language, gender, quality, age, style, type, sort, SSML, audio, favorites), all URL-synced
- Voice detail with audition studio, SSML visual editor, provider setup guides, **similar voices**, and **voice steerability** (OpenAI free-text instructions · ElevenLabs voice_settings + v3 audio tags · AWS Polly newscaster) — capability surfaced per voice in `/v1/voices` `steering`
- **Per-provider pages** (`/providers/[id]`) — counts, pricing, capabilities, voice gallery, connect CTA
- Server-side synthesis with 9 provider adapters; OpenAI defaults to `gpt-4o-mini-tts`. **Batch endpoint** `POST /v1/synthesize/batch` (≤50 jobs)
- SSML editor: 7 tags, attribute popovers, real-time validation, provider-aware
- Audio clips with full CRUD (name, tags, description, re-synthesize, download, search); clips report `durationMs`
- BYOK provider credentials with **real validity status** (Verified / Saved·unverified / Invalid)
- Vokda API keys for programmatic access (up to **25** active per account)
- TypeScript SDK (`packages/sdk`) incl. `synthesizeBatch`; served catalog OpenAPI has `components/schemas`
- Collections — pin, organize, export as Voice Pack JSON
- Auth live (Cognito), roles: visitor → guest → curator → admin
- 264 web unit tests + infra test suites, zero type errors

**Known gaps:**
- Amplify Data scaffolded but favorites/collections still in localStorage
- ElevenLabs free tier key flagged for unusual activity
- Metadata quality varies (sparse on bulk-added voices)
- No industry hub content yet (Phase 3)

## Constitutions

- **TypeScript/JavaScript**: `docs/constitutions/ts/CONSTITUTION.md`
- **Go**: `docs/constitutions/go/CONSTITUTION.md`

Key mandates: strict mode, no `any`, no floating promises, no swallowed errors, strict equality, descriptive names, runtime validation of external inputs.

## Rules

- Never commit `.env` files or secrets
- Never modify `amplify_outputs.json` directly — it's generated by `ampx`
- Don't modify files under `.svelte-kit/`, `build/`, `.amplify/artifacts/`, or `node_modules/`
- Keep voice catalog data in `apps/web/static/data/voices.json` (source of truth)
- Auth mode: `PUBLIC_AUTH_MODE` env var (`amplify` or `mock`)
- Synthesis API URL: `PUBLIC_SYNTHESIS_API_URL` env var (`https://api.vokda.iksnae.com`)
- Always run `npm run check:web` after making changes to verify no type errors
