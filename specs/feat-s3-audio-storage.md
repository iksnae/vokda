# Feature: S3 Audio Storage & Real Data Layer for Voices

## Description

Move voice and provider data from static JSON to the Amplify data layer (AppSync/DynamoDB), move audio assets from bundled static files to S3, and lay the foundation for user-connected provider accounts. Every design decision prioritizes **cost efficiency** — the system should cost near-zero at low traffic and scale linearly without surprise bills.

## Cost-Efficiency Design Principles

1. **No per-pageview DynamoDB reads for browsing** — public catalog served as static JSON generated from DynamoDB at publish time, not queried live
2. **No CloudFront distribution** — use S3 public read with Amplify Hosting's built-in CDN instead of paying for a separate CF distribution
3. **No system-managed synthesis API keys** — Vokda never pays provider bills on behalf of users. All synthesis uses BYOK (Bring Your Own Key)
4. **No server-side compute for reads** — static adapter stays; reads are free
5. **DynamoDB on-demand mode** — pay only for actual writes (admin/curator edits); browsing hits zero DDB capacity
6. **Minimal S3 classes** — catalog audio in S3 Standard (small, frequently accessed); user audio in S3 Intelligent-Tiering (auto-archives cold data)

### Cost Projections

| Component | Monthly Cost at 1K MAU | Monthly Cost at 10K MAU |
|---|---|---|
| DynamoDB (on-demand, ~50 writes/day curator edits) | ~$0.02 | ~$0.02 |
| S3 (194 MP3s × 100KB avg = ~20MB stored) | ~$0.01 | ~$0.01 |
| S3 GET requests (audio plays, ~5K/mo) | ~$0.01 | ~$0.05 |
| AppSync (auth-gated writes only) | ~$0.01 | ~$0.05 |
| Amplify Hosting (static site) | Free tier | Free tier |
| Synthesis API calls | $0 (user pays via BYOK) | $0 |
| **Total incremental** | **~$0.05/mo** | **~$0.13/mo** |

## PRD Alignment

- **§6.6** — "uploads audio to object storage + CDN URL saved to samples"
- **§8** — `Voice`, `VoiceVariant`, `VoiceSample` as data models
- **§9** — `GET /voices`, `POST /synthesize`
- **§11** — "Object storage for samples (S3-compatible)"
- **ROADMAP 1c** — "CDN-host audio samples"
- **ROADMAP 2c** — "Wire cloud provider adapters"

## Architecture

```
                    ┌─────────────────────┐
                    │  Admin / Curator UI  │
                    │  (authenticated)     │
                    └──────────┬──────────┘
                               │ AppSync mutations
                               ▼
                    ┌─────────────────────┐
                    │  DynamoDB Tables     │
                    │  Voice, Provider,    │
                    │  VoiceSample, etc.   │
                    └──────────┬──────────┘
                               │ "Publish" step
                               │ (script or Lambda)
                               ▼
                    ┌─────────────────────┐
                    │  S3 Bucket          │
                    │  /catalog.json      │ ← generated snapshot
                    │  /audio/{id}.mp3    │ ← uploaded audio files
                    └──────────┬──────────┘
                               │ public read
                               ▼
                    ┌─────────────────────┐
                    │  Static Frontend    │
                    │  (Amplify Hosting)   │
                    │                     │
                    │  fetch(/catalog.json)│ ← same as today, different URL
                    │  <audio src=s3>     │ ← direct S3 URLs
                    └─────────────────────┘

    User BYOK synthesis (future):
    ┌──────────┐    ┌──────────────┐    ┌──────────────┐
    │ Frontend │──→ │ API Gateway  │──→ │ Provider API │
    │ (client) │    │ + Lambda     │    │ (user's key) │
    └──────────┘    │ (decrypt key,│    └──────┬───────┘
                    │  proxy call) │           │ audio
                    └──────┬───────┘           │
                           │ save to           │
                           ▼                   │
                    ┌──────────────┐           │
                    │ S3 /users/   │◄──────────┘
                    │ {uid}/{job}  │
                    └──────────────┘
```

### Why Not Query DynamoDB Directly for Browsing?

At 10K MAU with 10 pageviews each → 100K catalog fetches/month. Each fetching 194 voice items:
- **Direct DDB**: 100K × 194 items = 19.4M read units → ~$2.50/mo (and growing linearly)
- **Static JSON from S3**: 100K GET requests → ~$0.04/mo (fixed cost regardless of catalog size)

The static snapshot pattern is **60x cheaper** and gets more cost-efficient as traffic grows.

## Scope

- [ ] New routes: none (static adapter; API handled by `apps/api`)
- [ ] New lib modules: `apps/web/src/lib/data/voice-store.ts`, `apps/web/src/lib/audio/cdn.ts`
- [ ] Type changes: new `AudioAsset`, `SynthesisJob`, `UserProviderCredential` types
- [ ] Amplify schema changes: new `VoiceRecord`, `ProviderRecord`, `VoiceSampleRecord`, `SynthesisJob`, `UserProviderCredential` models
- [ ] API changes: publish endpoint, credential CRUD, synthesis proxy (all in `apps/api`)
- [ ] Catalog data changes: `voices.json` generated from DynamoDB instead of hand-edited

---

## Milestone 1 — DynamoDB as Source of Truth

Move voice and provider data into Amplify Data models. Keep the static JSON as the public-facing format, but generate it from the database instead of editing it by hand.

### 1.1 Schema Changes — `amplify/data/resource.ts`

```ts
VoiceRecord: a.model({
  name: a.string().required(),
  provider: a.string().required(),
  providerId: a.string().required(),
  providerVoiceId: a.string(),
  description: a.string().required(),
  tags: a.string().array().required(),
  languages: a.string().array().required(),
  qualityTier: a.enum(['basic', 'standard', 'premium']),
  licenseNotes: a.string(),
  metadata: a.json().required(),       // VoiceMetadata
  modelCard: a.json(),                 // VoiceModelCard
  imageUrl: a.string(),
  audioUrl: a.string(),
  samples: a.json(),                   // VoiceSample[]
  variants: a.json(),                  // VoiceVariant[]
  status: a.enum(['draft', 'published', 'archived']),
  createdAtIso: a.string().required(),
  updatedAtIso: a.string().required()
}).authorization((allow) => [
  allow.groups(['curator', 'admin']).to(['create', 'read', 'update', 'delete']),
  allow.publicApiKey().to(['read'])
]),

ProviderRecord: a.model({
  name: a.string().required(),
  slug: a.string().required(),         // 'aws-polly', 'elevenlabs'
  type: a.enum(['cloud_provider', 'open_model', 'self_hosted', 'other']),
  websiteUrl: a.string(),
  description: a.string(),
  colorHex: a.string(),
  voiceCount: a.integer().default(0),
  status: a.enum(['active', 'inactive']),
  createdAtIso: a.string().required(),
  updatedAtIso: a.string().required()
}).authorization((allow) => [
  allow.groups(['curator', 'admin']).to(['create', 'read', 'update', 'delete']),
  allow.publicApiKey().to(['read'])
]),
```

### 1.2 Seed Script — `scripts/seed-dynamodb.mjs`

- Reads current `apps/web/static/data/voices.json` (194 voices)
- Reads `apps/web/src/lib/providers.ts` (19 providers)
- Upserts each as `VoiceRecord` / `ProviderRecord` via AppSync
- Idempotent — uses voice ID as DDB key, skips if unchanged
- Run once to migrate; then DynamoDB is the source of truth

### 1.3 Publish Script — `scripts/publish-catalog.mjs`

- Queries all `VoiceRecord` where `status = 'published'`
- Queries all `ProviderRecord` where `status = 'active'`
- Writes `apps/web/static/data/voices.json` (same format as today)
- Writes `apps/web/static/api/v1/voices.json`, per-voice JSONs, `providers.json`, `stats.json`
- Optionally uploads to S3 for non-build-time use
- **This replaces the manual JSON editing workflow** — curators edit in DynamoDB, then publish

### 1.4 Data Layer Module — `apps/web/src/lib/data/voice-store.ts`

```ts
// Used by admin/curation pages (authenticated, write path)
export async function listVoiceRecords(): Promise<VoiceRecord[]> { ... }
export async function getVoiceRecord(id: string): Promise<VoiceRecord | null> { ... }
export async function saveVoiceRecord(voice: VoiceRecord): Promise<void> { ... }
export async function deleteVoiceRecord(id: string): Promise<void> { ... }
export async function publishCatalog(): Promise<void> { ... }  // triggers rebuild

// Used by admin pages
export async function listProviderRecords(): Promise<ProviderRecord[]> { ... }
export async function saveProviderRecord(provider: ProviderRecord): Promise<void> { ... }
```

### 1.5 Frontend Changes

- **No changes to browse/detail pages** — they still fetch `voices.json` (same format)
- **Curation page** (`/curation`) — reads/writes `VoiceRecord` via AppSync instead of `CurationWorkspace.customVoices`
- **Admin page** (`/admin`) — adds provider CRUD via `ProviderRecord`
- `CurationWorkspace.customVoices` and `CurationWorkspace.providerCatalog` become **deprecated** — replaced by `VoiceRecord` and `ProviderRecord`

### Files Changed (M1)
- `amplify/data/resource.ts` — add VoiceRecord, ProviderRecord
- `amplify/backend.ts` — unchanged (data already registered)
- `scripts/seed-dynamodb.mjs` — new
- `scripts/publish-catalog.mjs` — new (replaces `generate-api.mjs` role)
- `apps/web/src/lib/data/voice-store.ts` — new
- `apps/web/src/routes/curation/+page.svelte` — modify (use voice-store)
- `apps/web/src/routes/admin/+page.svelte` — modify (add provider CRUD)

---

## Milestone 2 — S3 for Audio Assets

Move MP3 files from `apps/web/static/audio/samples/` to S3. Serve via public S3 URLs (no CloudFront needed at current scale).

### 2.1 Add Amplify Storage — `amplify/storage/resource.ts`

```ts
import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'vokdaAudio',
  access: (allow) => ({
    'catalog/*': [
      allow.guest.to(['read']),
      allow.groups(['admin']).to(['read', 'write', 'delete'])
    ],
    'users/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete'])
    ]
  })
});
```

### 2.2 Upload Script — `scripts/upload-audio-s3.mjs`

- Reads all `apps/web/static/audio/samples/*.mp3`
- Uploads to `s3://vokdaAudio/catalog/{voiceId}.mp3`
- Sets `Content-Type: audio/mpeg`, public read ACL
- Skips existing files with matching size (idempotent)
- Updates `VoiceRecord.audioUrl` in DynamoDB with S3 URL

### 2.3 CDN Helper — `apps/web/src/lib/audio/cdn.ts`

```ts
const AUDIO_BASE = import.meta.env.PUBLIC_AUDIO_BASE_URL ?? '';

export function audioUrl(voiceId: string): string {
  if (AUDIO_BASE) return `${AUDIO_BASE}/catalog/${voiceId}.mp3`;
  return `/audio/samples/${voiceId}.mp3`;  // local dev fallback
}
```

### 2.4 Local Dev Stays Free

- `PUBLIC_AUDIO_BASE_URL` unset in `.env` → serves from `static/` (no S3 calls)
- `PUBLIC_AUDIO_BASE_URL` set in `.env.production` → serves from S3
- Audio files stay in git for offline dev (but excluded from Amplify build artifact via `.amplifyignore`)

### 2.5 Shrink Build Artifact

```
# .amplifyignore (or amplify.yml artifact exclude)
apps/web/static/audio/samples/
apps/web/static/og/voices/
```

This drops the build artifact from 31MB to ~7MB: audio (17MB) and OG images (7MB) served from S3 instead.

### Files Changed (M2)
- `amplify/storage/resource.ts` — new
- `amplify/backend.ts` — add storage
- `scripts/upload-audio-s3.mjs` — new
- `apps/web/src/lib/audio/cdn.ts` — new
- `apps/web/src/lib/catalog.ts` — modify (apply `audioUrl()` rewrite)
- `apps/web/.env` — add `PUBLIC_AUDIO_BASE_URL`
- `.amplifyignore` or `amplify.yml` — exclude audio/og from deploy

---

## Milestone 3 — BYOK Synthesis (User Provider Accounts)

Users connect their own API keys. Vokda proxies synthesis requests using the user's key. **Vokda never pays for synthesis** — this is the key cost-efficiency decision.

### 3.1 Schema — `amplify/data/resource.ts`

```ts
UserProviderCredential: a.model({
  providerId: a.string().required(),
  label: a.string().required(),
  encryptedData: a.string().required(),   // AES-256-GCM encrypted JSON
  status: a.enum(['active', 'invalid', 'expired']),
  lastTestedAtIso: a.string(),
  createdAtIso: a.string().required(),
  updatedAtIso: a.string().required()
}).authorization((allow) => [allow.owner()]),

SynthesisJob: a.model({
  voiceId: a.string().required(),
  variantSourceKey: a.string().required(),
  inputText: a.string().required(),
  inputMode: a.enum(['text', 'ssml']),
  status: a.enum(['pending', 'completed', 'failed']),
  audioPath: a.string(),
  durationMs: a.integer(),
  latencyMs: a.integer(),
  provider: a.string().required(),
  errorMessage: a.string(),
  createdAtIso: a.string().required()
}).authorization((allow) => [allow.owner()]),
```

### 3.2 Credential Flow

1. User navigates to `/account/providers`
2. Selects provider (e.g., "ElevenLabs") → enters API key
3. Frontend encrypts key with a per-user derived key (PBKDF2 from Cognito sub + app secret)
4. Encrypted blob saved to `UserProviderCredential`
5. Frontend calls `POST /api/test-credential` → API decrypts, makes lightweight provider call → returns success/failure
6. Credential marked `active` or `invalid`

### 3.3 Synthesis Flow (BYOK Only)

1. User on voice detail page → types text → clicks "Synthesize"
2. Frontend `POST /api/synthesize` with `{ voiceId, text, mode }`
3. API resolves adapter from variant `sourceKey`
4. API loads user's `UserProviderCredential` for that provider → decrypts
5. API calls provider with user's key → receives audio
6. API uploads to `s3://users/{userId}/{jobId}.mp3`
7. API returns pre-signed S3 URL (1-hour expiry)
8. Frontend plays audio

**No system credentials needed** — if user hasn't connected a key for that provider, synthesis button is disabled with message: "Connect your {provider} API key to synthesize"

### 3.4 Cost Structure

| Who Pays | For What |
|---|---|
| **User** | Provider API charges (their key, their billing) |
| **Vokda** | Lambda invocations (~$0.20 per 1M), S3 storage (~$0.023/GB), DynamoDB writes |
| **Vokda** | Nothing for idle users — zero baseline cost |

### 3.5 Rate Limits (Abuse Prevention, Not Cost — User Pays Provider)

- 30 requests/minute per user (prevent accidental loops)
- 5,000 chars max per request
- 100 jobs/day per user
- Auto-delete audio files older than 30 days (S3 lifecycle rule)

### Files Changed (M3)
- `amplify/data/resource.ts` — add UserProviderCredential, SynthesisJob
- `apps/web/src/lib/providers/credentials.ts` — new (types + encryption)
- `apps/web/src/lib/providers/verification.ts` — new (test credential)
- `apps/web/src/routes/account/providers/+page.svelte` — new
- `apps/web/src/routes/account/providers/+page.ts` — new
- `apps/web/src/lib/synthesis/adapters/*.ts` — replace mocks with real implementations
- `apps/api/src/routes/synthesize.mjs` — new (proxy + decrypt)
- `apps/api/src/routes/test-credential.mjs` — new
- `apps/api/src/lib/crypto.mjs` — new (AES-256-GCM helpers)

---

## Type Changes — `apps/web/src/lib/types.ts`

```ts
export type VoiceRecord = Voice & {
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
};

export type ProviderRecord = ProviderDefinition & {
  description?: string;
  colorHex?: string;
  voiceCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

export type UserProviderCredential = {
  id: string;
  providerId: string;
  label: string;
  status: 'active' | 'invalid' | 'expired';
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SynthesisJob = {
  id: string;
  voiceId: string;
  variantSourceKey: string;
  inputText: string;
  inputMode: 'text' | 'ssml';
  status: 'pending' | 'completed' | 'failed';
  audioUrl?: string;
  durationMs?: number;
  latencyMs?: number;
  provider: string;
  errorMessage?: string;
  createdAt: string;
};
```

## Environment Variables

| Variable | Milestone | Purpose | Cost |
|---|---|---|---|
| `PUBLIC_AUDIO_BASE_URL` | 2 | S3 bucket URL for audio | $0 (reads are cheap) |
| `CREDENTIAL_ENCRYPTION_SECRET` | 3 | App-level secret for key derivation | $0 |

**No provider API keys in Vokda's environment** — that's the whole point of BYOK.

## Testing

- **Typecheck**: `npm run check:web`
- **Build**: `npm run build:web`
- **Unit tests**: `npm test`
- **Manual verification**:
  - M1: Run seed → verify DynamoDB has 194 voices → run publish → verify `voices.json` identical → browse works
  - M2: Audio plays from S3 URLs in production; local dev still works with static fallback
  - M3: Connect API key → synthesize → audio plays → check S3 user path

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| DynamoDB schema drift from Voice type | Build breaks | Seed script validates against TypeScript types before writing |
| S3 public bucket misconfiguration | Audio inaccessible | Amplify Storage handles ACLs; test in preview env first |
| User credential encryption weakness | Key exposure | Use established pattern (AES-256-GCM + PBKDF2); security review before shipping M3 |
| Provider API changes break adapters | Synthesis fails | Per-adapter error handling; graceful fallback with clear error messages |
| Amplify Gen2 storage access pattern limitations | Can't do per-user paths | Verified: `{entity_id}` pattern is supported in Amplify Gen2 storage access rules |

## Sequencing

1. **M1 first** — establishes DynamoDB as source of truth; no infrastructure changes needed; curators get a real editing workflow
2. **M2 second** — shrinks deploy artifact; audio served from S3; straightforward migration
3. **M3 last** — highest complexity (encryption, proxy, per-provider adapters); only after M1+M2 prove the data and storage layers work

## What This Replaces

| Before | After |
|---|---|
| Hand-edit `voices.json` via scripts | Curators edit via AppSync; publish generates JSON |
| `CurationWorkspace.customVoices` (JSON blob in DDB) | Individual `VoiceRecord` rows (queryable, indexable) |
| `CurationWorkspace.providerCatalog` (JSON blob in DDB) | Individual `ProviderRecord` rows |
| `DEFAULT_PROVIDERS` array in source code | `ProviderRecord` table (editable without deploy) |
| Audio bundled in static build (17MB) | Audio in S3 (~$0.01/mo) |
| Mock synthesis adapters | Real adapters using user's own API keys |
| Vokda pays for synthesis | User pays (BYOK) |
