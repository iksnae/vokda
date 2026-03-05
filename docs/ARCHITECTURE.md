# Vokda Architecture

> See [VISION.md](./VISION.md) for the product vision this architecture serves.

---

## 1. Current State (March 2026)

Vokda is a **static-first SvelteKit app** deployed on AWS Amplify, with Amplify Gen2 backend (Cognito auth + AppSync/DynamoDB) and a lightweight Node.js admin API.

```
┌─────────────────────────────────────────────────┐
│  Browser                                        │
│  SvelteKit app (static, client-side rendered)   │
│  - voices.json (130 voices, bundled)            │
│  - audio samples (static /audio/samples/*.mp3)  │
│  - localStorage (favorites, collections)        │
└───────────────┬─────────────────────────────────┘
                │
        ┌───────▼──────┐      ┌──────────────────┐
        │ AWS Amplify  │      │ Amplify Gen2     │
        │ (hosting)    │      │ - Cognito auth   │
        │ main → prod  │      │ - AppSync/DDB    │
        │ PR → preview │      │ (wired, unused)  │
        └──────────────┘      └──────────────────┘
                                       │
                              ┌────────▼─────────┐
                              │  apps/api        │
                              │  Node.js HTTP    │
                              │  - role mgmt     │
                              │  - synthesis gw  │
                              │  (scaffolded)    │
                              └──────────────────┘
```

**Key limitation today:** Amplify Data (DynamoDB) is fully scaffolded but favorites and collections still live in localStorage. Auth is live but saves don't persist across sessions.

---

## 2. Target Architecture

As Vokda grows into the full vision (discovery + industry hub), the architecture expands in three areas:

### 2a. Audio CDN
Static audio samples bundled in the repo won't scale past a few hundred voices. Audio moves to S3 + CloudFront:
```
voices.json → references audioUrl: "https://cdn.vokda.com/samples/{voiceId}/{scriptKey}.mp3"
```

### 2b. Backend API (apps/api)
The admin API becomes a proper service layer:
- `GET /voices` — filterable catalog (eventually DB-backed, not static JSON)
- `POST /synthesize` — proxied real-time synthesis (provider-agnostic)
- `POST /ingest/run` — trigger provider sync jobs
- `GET /news` — curated TTS news feed entries
- `GET /models` — provider + model registry

### 2c. Ingestion Pipeline
Scheduled jobs (Lambda or local cron) that:
- Query provider APIs for new voices
- Diff against current catalog
- Generate samples for new entries
- Queue for admin review before going live

---

## 3. Components

### Frontend (`apps/web`)

- SvelteKit 4 with static adapter
- TypeScript strict mode throughout
- Component-scoped CSS (no framework)
- Phosphor icons via `phosphor-svelte`

**Key modules:**
```
src/lib/
  types.ts              — All shared TypeScript types (Voice, VoiceVariant, Collection, etc.)
  catalog.ts            — Loads voices.json at build time
  voice-catalog.ts      — Metadata patching, effective catalog builder
  voice-utils.ts        — SSML stripping, variant warnings, text truncation
  providers.ts          — Provider definitions and normalization
  provider-colors.ts    — Per-provider brand color schemes
  stores/app-state.ts   — Collections, favorites, curation state (Svelte stores)
  auth/                 — Amplify Cognito auth (store, config, types, client)
  data/                 — Amplify Data layer (user-library, curation-workspace)
  synthesis/            — Adapter registry + adapters (all mock currently)
  components/
    Icon.svelte         — Phosphor icon wrapper
    Toast.svelte        — Toast notification UI
```

**Routes:**
```
/                       — Catalog browse (Pinterest grid)
/voices/[id]            — Voice detail (player, audition, variants)
/collections            — Collections list
/collections/[id]       — Collection detail + export
/curation               — Curator metadata workspace (curator+)
/admin                  — Admin panel (admin only)
/account                — Sign in / sign up / verify
```

### Catalog Data (`apps/web/static/data/voices.json`)

Source of truth for the voice catalog. Format documented in [voice-discovery-process.md](./voice-discovery-process.md).

**Current scale:** 130 voices, 128 with audio samples. Growing.

**Future:** JSON stays as the canonical source for the static build. A DB-backed API layer will mirror it for dynamic queries and admin operations.

### Admin API (`apps/api`)

Vanilla Node.js HTTP server. Currently handles:
- Cognito user role management (promote/demote users to guest/curator/admin)
- Synthesis preview gateway (scaffolded, adapters mock)

### Amplify Backend (`amplify/`)

Amplify Gen2 (TypeScript-first). Manages:
- **Auth:** Cognito user pools with email login. Groups: `guest`, `curator`, `admin`
- **Data:** AppSync + DynamoDB schema for Favorite, Collection, CollectionVoice, CurationWorkspace

### Scripts (`scripts/`)

Node.js and Python scripts for catalog management:
- `discover-voices.mjs` — Query provider APIs for available voices
- `curate-catalog.mjs` — Filter discovery output to catalog additions
- `generate-all-samples.mjs` — Generate MP3 samples via cloud APIs
- `generate-local-samples.py` — Generate samples via mlx-audio (Kokoro, Qwen3)

---

## 4. Data Flow

### Browse & Discover (current)
```
Build time: voices.json → bundled into static build
Runtime: client loads catalog → filter/search in-browser → play from /audio/samples/
```

### Save to Collection (current — localStorage)
```
User pins voice → app-state.ts store → localStorage → lost on new device/browser
```

### Save to Collection (target — Amplify)
```
User pins voice → app-state.ts store → Amplify Data client → AppSync → DynamoDB
                                     ← sync on load (authenticated)
```

### Live Synthesis (target)
```
User types text on detail page → POST /synthesize (apps/api) 
  → provider adapter (AWS Polly / ElevenLabs / OpenAI / ...) 
  → stream audio back → play in browser
```

---

## 5. Auth Model

| Role | Access |
|------|--------|
| `visitor` | Browse catalog, play samples |
| `guest` | + Save favorites, manage collections, export Voice Packs, use audition studio |
| `curator` | + Curation workspace (metadata enrichment, voice drafts) |
| `admin` | + Admin panel (role management, ingestion triggers, catalog ops) |

---

## 6. Deployment

| Environment | Trigger | URL |
|-------------|---------|-----|
| Production | Push to `main` | https://vokda.iknsae.com |
| Preview | Open PR | `https://<branch>.amplifyapp.com` |

**AWS Amplify** owns frontend hosting. GitHub Actions runs quality checks (typecheck, tests) on push/PR but does not deploy.

Required env vars:
- `PUBLIC_APP_ENV` — `development` | `production`
- `PUBLIC_AUTH_MODE` — `amplify` | `mock`
- `PUBLIC_SYNTH_MODE` — `mock` | `gateway`

---

## 7. Catalog Growth Strategy

| Phase | Source | Scale |
|-------|--------|-------|
| Now | Hand-curated + discovery scripts | ~130 voices |
| Phase 1 | + Cartesia, PlayHT, Fish Audio, Hume | ~200+ voices |
| Phase 2 | + Automated HuggingFace scanner | Open-ended |
| Phase 3 | + Community submissions (curator-reviewed) | Open-ended |

The catalog will always be **curated, not exhaustive.** Every voice that ships has a sample. Every sample is quality-checked. The curation bar is what makes Vokda trustworthy.
