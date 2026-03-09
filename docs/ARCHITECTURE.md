# Vokda Architecture

> See [VISION.md](./VISION.md) for the product vision this architecture serves.
> See [SYNTHESIS_API.md](./SYNTHESIS_API.md) for API endpoint documentation.

---

## 1. System Overview (March 2026)

Vokda is a **static-first SvelteKit app** deployed on AWS Amplify, backed by a serverless Synthesis API (AWS Lambda + API Gateway), Amplify Gen2 backend (Cognito auth + AppSync/DynamoDB), and an S3 audio storage layer.

```
┌──────────────────────────────────────────────────────┐
│  Browser                                             │
│  SvelteKit 4 (static, client-side rendered)          │
│  - 550 voices from voices.json (bundled at build)    │
│  - Audio samples from /audio/samples/*.mp3           │
│  - SSML visual editor (7 tags, 4 SSML providers)     │
│  - Clips store (API-backed, not IndexedDB)           │
└──────────┬───────────────────────────────────────────┘
           │
   ┌───────▼──────────┐     ┌───────────────────────────────┐
   │  AWS Amplify      │     │  Amplify Gen2 Backend          │
   │  (static hosting) │     │  - Cognito user pools           │
   │  main → prod      │     │  - AppSync / DynamoDB (12 tbl)  │
   │  PRs → preview    │     │  - Identity pool                │
   └──────────────────┘     └──────────┬────────────────────┘
                                       │
   ┌───────────────────────────────────▼────────────────────┐
   │  Synthesis API  (api.vokda.iksnae.com)                 │
   │  SAM stack: vokda-synthesis-dev                        │
   │  ┌─────────────────────────────────────────────────┐   │
   │  │  API Gateway (HTTP API)                         │   │
   │  │  → SynthesisRouter Lambda (512MB, Node 20)      │   │
   │  │    ├─ POST /v1/synthesize  (9 provider adapters)│   │
   │  │    ├─ GET /v1/providers, /v1/voices, /voices/{id}│  │
   │  │    ├─ GET/PATCH/DELETE /v1/jobs/{id}            │   │
   │  │    ├─ POST/GET/DELETE /v1/credentials           │   │
   │  │    ├─ POST/GET/DELETE /v1/keys                  │   │
   │  │    └─ GET /v1/media/usage                       │   │
   │  ├─────────────────────────────────────────────────┤   │
   │  │  SynthesisWorker Lambda (async, SQS-triggered)  │   │
   │  │  Auth Lambda (Cognito JWT + API key validation)  │   │
   │  ├─────────────────────────────────────────────────┤   │
   │  │  S3: vokda-audio-bucket (user synth clips)      │   │
   │  │  SQS: vokda-synthesis-dev (async job queue)     │   │
   │  │  DynamoDB: VokdaApiKey-dev, UserMediaUsage-dev  │   │
   │  └─────────────────────────────────────────────────┘   │
   └────────────────────────────────────────────────────────┘
```

---

## 2. Components

### Frontend (`apps/web`)

SvelteKit 4 with static adapter. TypeScript strict mode. Component-scoped CSS.

**Key modules:**
```
src/lib/
  types.ts                 — All shared TypeScript types
  catalog.ts               — Loads voices.json at runtime (fetch)
  voice-catalog.ts         — Metadata patching, effective catalog builder
  voice-utils.ts           — SSML stripping, variant warnings, text truncation
  providers.ts             — Provider definitions and normalization

  auth/
    store.ts               — Amplify Cognito auth state (writable store)
    config.ts              — Auth mode config (amplify vs mock)
    amplify-client.ts      — Amplify client initialization

  stores/
    app-state.ts           — Collections, favorites, curation (Svelte stores)
    clips.ts               — API-backed clip store (fetch from /v1/jobs)
    credentials.ts         — Provider credential management

  data/
    user-library.ts        — Amplify Data: favorites, collections
    credential-store.ts    — Amplify Data: UserProviderCredential CRUD
    clip-store.ts          — Legacy (replaced by stores/clips.ts)

  synthesis/
    service.ts             — Orchestrates synthesis (API mode, gateway, browser)
    registry.ts            — Adapter registry, provider detection
    provider-auth.ts       — Provider credential checking
    constraints.ts         — Input normalization (char limits, etc.)
    types.ts               — SynthesisRequest, SynthesisPreview types
    adapters/              — 9 real + mock adapters per provider

  ssml/
    tags.ts                — Tag registry (7 tags, 4 providers, attributes)
    validate.ts            — DOMParser-based SSML validation
    serialize.ts           — wrapSpeak, insertTag with cursor positioning

  components/
    Icon.svelte            — Icon wrapper (20+ icons)
    SsmlEditor.svelte      — Composite SSML editor (toolbar + textarea + validation)
    SsmlToolbar.svelte     — Tag buttons with attribute popovers
    ProviderSetupGuide.svelte — Contextual provider setup guidance
```

**Routes:**
```
/                          — Catalog browse (Pinterest grid, 11 filters, URL-synced)
/voices/[id]               — Voice detail (player, audition studio, SSML editor)
/collections               — Collections list
/collections/[id]          — Collection detail + Voice Pack export
/curation                  — Curator metadata workspace (curator+)
/admin                     — Admin panel (admin only)
/account                   — Sign in / sign up / verify / quick nav
/account/providers         — BYOK provider key management
/account/api-keys          — Vokda API key management
/account/clips             — Audio clip library (full CRUD)
```

### Catalog Data (`apps/web/static/data/voices.json`)

Source of truth for voice metadata. **550 voices** across **25 providers** in **53 languages**.

Structure per voice:
```json
{
  "id": "01KJ...",
  "name": "Joanna",
  "providerId": "aws-polly",
  "providerVoiceId": "Joanna",
  "description": "...",
  "tags": ["narration", "assistant"],
  "languages": ["en-US"],
  "qualityTier": "premium",
  "gender": "female",
  "speakingStyle": "balanced",
  "variants": [{ "id": "...", "sourceKey": "aws:polly:Joanna", "supportsSsml": true, ... }],
  "samples": [{ "scriptKey": "intro", "audioUrl": "/audio/samples/..." }],
  "modelCard": { "modelName": "...", "capabilities": {...}, ... }
}
```

### Synthesis API (`infra/`)

SAM-deployed serverless stack. Three Lambda functions behind API Gateway.

**Router Lambda** — synchronous synthesis + clip CRUD + key management:
- Authenticates via Cognito JWT or Vokda API key (`vk_live_...`)
- Routes to provider adapters based on `provider` field
- Stores audio in S3, metadata in DynamoDB (SynthesisJob table)
- Presigns S3 URLs (7-day expiry)

**9 Provider Adapters:**

| Adapter | File | Auth Type | Method |
|---------|------|-----------|--------|
| OpenAI | `openai.mjs` | API key | REST API |
| ElevenLabs | `elevenlabs.mjs` | API key | REST API |
| Deepgram | `deepgram.mjs` | API key | REST API |
| Gemini TTS | `gemini-tts.mjs` | API key | REST API |
| Cartesia | `cartesia.mjs` | API key | REST API |
| LMNT | `lmnt.mjs` | API key | REST API |
| Google Cloud TTS | `gcp-tts.mjs` | API key | REST API |
| Azure Speech | `azure-speech.mjs` | Subscription key + region | REST API |
| AWS Polly | `aws-polly.mjs` | IAM credentials | AWS SDK |

**Worker Lambda** — SQS-triggered async processing (future use).

**Auth Lambda** — standalone authorizer (used by API Gateway).

### Amplify Backend (`amplify/`)

Amplify Gen2 (TypeScript-first). Manages:

**Auth** — Cognito user pools with email login. Groups: `guest`, `curator`, `admin`.

**Data** — AppSync + DynamoDB. 10 tables:

| Model | Purpose | Auth |
|-------|---------|------|
| `Favorite` | Saved voice IDs | Owner only |
| `Collection` | Named voice collections | Owner + curator/admin |
| `CollectionVoice` | Voice-to-collection mapping | Owner + curator/admin |
| `CurationShelf` | Curated themed voice lists | Curator/admin + public read |
| `CurationWorkspace` | Metadata override workspace | Curator/admin + public read |
| `VoiceRecord` | DB-backed voice catalog (future) | Curator/admin + public read |
| `ProviderRecord` | Provider registry (future) | Curator/admin + public read |
| `UserProviderCredential` | BYOK encrypted API keys | Owner only |
| `SynthesisJob` | Synthesis job/clip metadata | Owner only |
| `AdminAuditEvent` | Admin action log | Admin only |

**SAM-managed tables** (2):

| Table | Purpose |
|-------|---------|
| `VokdaApiKey-dev` | Vokda API key hashes + metadata |
| `UserMediaUsage-dev` | Per-user storage quota tracking |

---

## 3. Data Flow

### Browse & Discover
```
Build: voices.json bundled into static build
Runtime: client fetches /data/voices.json → filter/search in-browser → play /audio/samples/
Filters sync to URL params → shareable/bookmarkable filtered views
```

### Synthesis (API Mode — Default)
```
User types text → Ctrl+Enter → synthesizePreview()
  → POST /v1/synthesize (api.vokda.iksnae.com)
  → Router authenticates (JWT or API key)
  → Router loads user's provider credential from DynamoDB
  → Provider adapter calls external TTS API
  → Audio saved to S3, metadata to SynthesisJob table
  → Presigned S3 URL returned to client
  → Client plays audio, clip appears in library
```

### Clip Management
```
Clips page loads → GET /v1/jobs (auth token in header)
  → Router returns all user's jobs with presigned audio URLs
Edit clip → PATCH /v1/jobs/{id} → update clipName/clipDescription/clipTags
Delete clip → DELETE /v1/jobs/{id} → removes DynamoDB record + S3 object
Re-synth → navigate to /voices/{id}?text=...&mode=ssml → pre-filled audition panel
```

### SSML Pipeline
```
User switches to SSML mode in audition panel
  → SsmlEditor renders: SsmlToolbar + textarea + validation bar
  → Tag insertion: click button → configure attributes in popover → insert at cursor
  → Real-time validation: DOMParser checks well-formedness, provider-aware tag checking
  → On synthesize: mode='ssml' sent to API → adapter passes SSML to provider
  → Provider-specific handling (e.g., GCP: { ssml: text }, Polly: TextType='ssml')
```

### Authentication
```
Sign up: email + password → Cognito → verification email → confirm code
Sign in: email + password → Cognito → JWT (ID + access token) → stored in auth store
API calls: JWT sent as Bearer token → Router validates issuer + expiry
API keys: create via POST /v1/keys → SHA-256 hashed in DynamoDB → use as Bearer token
```

---

## 4. Auth Model

| Role | Access |
|------|--------|
| `visitor` | Browse catalog, play samples, use filters |
| `guest` | + Favorites, collections, export Voice Packs, synthesis, clips |
| `curator` | + Curation workspace, metadata editing, curated shelves |
| `admin` | + User role management, provider CRUD, admin panel |

**BYOK (Bring Your Own Key):** Users store their own provider API keys. Keys are encrypted in DynamoDB with owner-only access. The Synthesis API reads keys server-side — they never appear in request/response bodies.

---

## 5. Infrastructure

### AWS Resources

| Service | Resource | Purpose |
|---------|----------|---------|
| Amplify | App `d2k1odilh9xpem` | Static hosting (main → prod) |
| Cognito | Pool `us-east-1_O3MJpNRMk` | User authentication |
| Cognito | Client `3n25mheafl42ttssn8pde92lh8` | App client |
| Cognito | Identity pool `us-east-1:2616cc88-...` | Federated identity |
| AppSync | API `qye3mrxz5rcfjpgw4uebq6emfi` | GraphQL data layer |
| DynamoDB | 12 tables | Data storage |
| Lambda | 3 functions | Synthesis API |
| API Gateway | HTTP API | API routing + CORS |
| S3 | Audio bucket | Synthesized clip storage |
| SQS | Queue | Async job processing |
| Route 53 | `api.vokda.iksnae.com` | API custom domain |

### Environment Variables

| Variable | Values | Where |
|----------|--------|-------|
| `PUBLIC_APP_ENV` | `development` / `production` | Amplify Console |
| `PUBLIC_AUTH_MODE` | `amplify` / `mock` | Amplify Console |
| `PUBLIC_SYNTHESIS_API_URL` | `https://api.vokda.iksnae.com` | Amplify Console |

---

## 6. Deployment

### Frontend
| Environment | Trigger | URL |
|-------------|---------|-----|
| Production | Push to `main` | https://vokda.iknsae.com |
| Preview | Open PR | `https://<branch>.amplifyapp.com` |

### Synthesis API
```bash
cd infra && sam build && sam deploy    # deploys to us-east-1
```
Stack: `vokda-synthesis-dev`. Changes deploy immediately on `sam deploy`.

### Amplify Backend
```bash
npx ampx sandbox    # local dev (generates amplify_outputs.json)
```
Production backend deployed automatically by Amplify on push to `main`.

---

## 7. Catalog Scale

| Metric | Current |
|--------|---------|
| **Voices** | 550 |
| **Providers** | 25 |
| **Languages** | 53 |
| **Audio samples** | 550 (100% coverage) |
| **SSML-capable variants** | 114 |
| **Server-side synthesis** | 9 providers |
| **Unit tests** | 178 |
