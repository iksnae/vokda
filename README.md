# Vokda

**Vokda is the central destination for everything TTS** — voice discovery and curation (Pinterest for voices) plus an industry hub tracking new models, news, reviews, and guidance.

550 voices across 25 providers, 100% with audio samples, 53 languages. Browse, play, pin, organize, export — and synthesize with provider-aware SSML steering via a SAM-deployed API.

## Live

| Endpoint | URL |
|----------|-----|
| App | [vokda.iknsae.com](https://vokda.iknsae.com) |
| Synthesis API | [api.vokda.iksnae.com](https://api.vokda.iksnae.com) |

## Node Version

**Node >=20** is required. The repo includes an `.nvmrc` pinning the current LTS.

## Stack

- **UI:** SvelteKit 4 (TypeScript), static adapter, hosted on AWS Amplify
- **Catalog:** static `voices.json` catalog (source of truth), published at build time
- **Synthesis API:** SAM-deployed Lambda with 9 provider adapters (OpenAI, ElevenLabs, AWS Polly, Azure, Google, Cartesia, Deepgram, LMNT, Edge TTS), API key auth, S3 audio storage
- **Backend:** Amplify Gen2 (Cognito auth + AppSync + 10 DynamoDB tables) for favorites, collections, credentials, clips
- **SCM + CI/CD:** GitHub (private, `iksnae` org), GitHub Actions on push to `main` and PRs

## Repo Layout

```
├── apps/
│   ├── web/          SvelteKit frontend
│   └── api/          Admin API (role management)
├── packages/
│   └── sdk/          TypeScript SDK (@vokda/sdk)
├── sdks/             Go, Python, Rust SDK stubs
├── infra/            SAM stack (Synthesis API — Lambda, API Gateway, SQS, DynamoDB)
├── amplify/          Amplify Gen2 backend (Cognito, AppSync, DynamoDB)
├── scripts/          Catalog generation, curation, enrichment, publishing
├── specs/            Feature specs and chore plans
├── extensions/       Agent extension tooling
└── docs/             Product and implementation documents
```

## Quick Start

```bash
# Prerequisite: Node >=20
npm install                  # install all workspace deps

# Development
npm run dev:web              # SvelteKit dev server
npm run dev:api              # Admin API (port 8787)

# Testing & quality (run before pushing)
npm test                     # 264 unit tests (vitest)
npm run check:web            # svelte-check + TypeScript typecheck
npm run build:web            # catalog publish + production build (static adapter)
npm run build:sdk             # build the TypeScript SDK
npm run check:sdk             # typecheck the SDK
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on push to `main` and on PRs:

1. **Typecheck** — `npm run check:web` (svelte-check + `tsc --noEmit`)
2. **Build** — `npm run build:web` (runs `publish-catalog.mjs`, then production build)
3. **Catalog freshness** — `node scripts/check-catalog-fresh.mjs`

AWS Amplify handles preview and production frontend deployments from GitHub branches. `amplify.yml` is configured for monorepo builds with `apps/web` as the app root.

## Product Docs

| Doc | Purpose |
|-----|---------|
| [PRD.md](./PRD.md) | Product requirements |
| [CLAUDE.md](./CLAUDE.md) | Agent instructions & project overview |
| [docs/VISION.md](./docs/VISION.md) | Product vision |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Delivery plan & phase status |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture & data flow |
| [docs/SCHEMA.md](./docs/SCHEMA.md) | Data models (catalog, Amplify, API) |
| [docs/DISCOVERY.md](./docs/DISCOVERY.md) | User guide — browse, search, SSML, collections, clips |
| [docs/SYNTHESIS_API.md](./docs/SYNTHESIS_API.md) | API reference — endpoints, auth, providers, examples |
| [docs/API.md](./docs/API.md) | API index |
| [docs/AMPLIFY_SETUP.md](./docs/AMPLIFY_SETUP.md) | Amplify Gen2 backend setup |
| [docs/AMPLIFY_BACKEND_GEN2.md](./docs/AMPLIFY_BACKEND_GEN2.md) | Amplify backend reference |
| [docs/GITHUB_SETUP.md](./docs/GITHUB_SETUP.md) | GitHub configuration |
| [docs/PROVIDER_IDS.md](./docs/PROVIDER_IDS.md) | Provider ID stability & deprecation policy |
| [docs/VOICE_CATALOG_EXPORT.md](./docs/VOICE_CATALOG_EXPORT.md) | Catalog export & format |
| [docs/voice-discovery-process.md](./docs/voice-discovery-process.md) | Voice discovery & curation workflow |
| [docs/GLOSSARY.md](./docs/GLOSSARY.md) | Terminology |
| [docs/constitutions/](./docs/constitutions/) | Code constitutions (TS, Go) |
| [docs/research/](./docs/research/) | Research notes |
| [docs/specs/](./docs/specs/) | Implementation specs |

## Features

- **Voice Discovery** — Pinterest-style browse grid with 11 filters (provider, language, gender, quality, age, style, type, sort, SSML, audio, favorites), all URL-synced
- **Voice Detail** — audition studio, similar voices, per-provider pages with pricing and capabilities
- **SSML Editor** — visual editor with 7 tags, attribute popovers, real-time validation, provider-aware
- **Synthesis API** — 9 provider adapters with voice steerability (OpenAI free-text instructions, ElevenLabs voice_settings + v3 tags, AWS Polly newscaster); batch endpoint (`POST /v1/synthesize/batch`, ≤50 jobs)
- **Audio Clips** — full CRUD (name, tags, description, re-synthesize, download, search); `durationMs` reported
- **Collections** — pin, organize, export as Voice Pack JSON
- **Auth** — Cognito (visitor → guest → curator → admin); Vokda API keys (up to 25 per account); BYOK provider credentials with real validity status
- **TypeScript SDK** — `@vokda/sdk` with `synthesizeBatch` support
