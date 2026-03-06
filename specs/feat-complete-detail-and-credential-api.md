# Feature: Complete Voice/Provider Detail & Credential Management API

## Description

Ensure Vokda provides **complete, rich detail** about every voice, provider, and model in the catalog — and extend the Synthesis API with **Provider Credential CRUD** so users can manage their BYOK keys programmatically (not just through the web UI via Amplify Data).

This is two tightly related workstreams:

1. **Information completeness** — Fill gaps in voice detail pages, provider pages, and model cards so every entity in the catalog tells a full story: what it is, who makes it, what it costs, what it can do, and how to use it.

2. **Credential management API** — Add `POST/GET/DELETE /v1/credentials` endpoints to the Synthesis API so API key users can store, list, and remove provider credentials without the Amplify Data layer (which requires a browser + Cognito JWT). This unblocks CLI usage and CI/CD pipelines.

## PRD Alignment

- **VISION.md**: "The place you go when you need a voice" — requires complete information
- **ROADMAP.md Phase 1a**: Metadata enrichment, `metadataQuality` standardization
- **ROADMAP.md Phase 4a**: Public API (programmatic credential management)
- **ARCHITECTURE.md**: BYOK model — credentials currently split between Amplify Data (web) and router `loadCredential` (API), creating a gap for API-only users

## Current State

### Voice Detail (`/voices/[id]`)
- ✅ Voice profile: gender, quality, language, accent, style, age, tags, use-cases
- ✅ Model card: provider, type, family, model name, architecture, capabilities, audio specs, license, limitations
- ✅ Audition panel: text + SSML synthesis, clip saving
- ✅ Samples: pre-generated audio player
- ✅ IDs: voiceId, providerVoiceId, sourceKey
- ❌ **No pricing context** — user doesn't know what synthesis costs per character
- ❌ **No "similar voices"** — no way to find alternatives
- ❌ **No provider link-out** — providerUrl shown in model card but not prominently
- ❌ **No usage stats** — how many clips made with this voice, avg latency

### Provider Pages (`/docs/providers`)
- ✅ Static docs page with 16 providers, descriptions, features, pricing
- ❌ **Not dynamic** — doesn't pull from catalog data, counts hardcoded
- ❌ **No individual provider pages** — `/providers/openai` doesn't exist
- ❌ **No connection status** — doesn't show if user has key connected

### Provider Auth Config (`provider-auth.ts`)
- ✅ 16 providers with auth type, fields, docsUrl, notes
- ❌ **No signupUrl** — user can't get to provider signup from config
- ❌ **No pricingUrl** — no link to pricing pages
- ❌ **No pricing summary** — free tier info only in `notes` string, not structured

### Credential Management
- ✅ Web: Amplify Data CRUD (credential-store.ts → AppSync → DynamoDB)
- ✅ API: `loadCredential()` reads from same DynamoDB table
- ❌ **No API write endpoints** — can't create/update/delete credentials via API
- ❌ **CLI users blocked** — must use web UI to add provider keys
- ❌ **No credential test endpoint** — can't verify a key works without synthesizing

### Data Coverage (550 voices)
- 550/550 have modelCard (100%)
- 476/550 have modelName (87%)
- 549/550 have providerUrl (99.8%)
- 550/550 have license (100%)
- Metadata quality: 90 sparse, 397 curated, 7 editorial

## Scope

- [ ] New routes: `/providers/[id]` (dynamic provider detail page)
- [ ] New lib modules: `$lib/provider-catalog.ts` (provider metadata + voice aggregation)
- [ ] Type changes: Extend `ProviderAuthConfig` with `signupUrl`, `pricingUrl`, `pricingSummary`; add `ProviderDetail` type
- [ ] Amplify schema changes: none (credentials already in `UserProviderCredential`)
- [ ] API changes: Add `POST/GET/DELETE /v1/credentials` endpoints to synthesis router
- [ ] Catalog data changes: none (data coverage already good)

## Implementation Steps

### Part A: Provider Credential API (backend)

**A1. Add credential CRUD to synthesis router**

Add three new endpoints to `infra/functions/synthesis-router/index.mjs`:

```
POST   /v1/credentials          — Store a provider credential
GET    /v1/credentials          — List user's credentials (data masked)
DELETE /v1/credentials/{provider} — Remove a credential
POST   /v1/credentials/test     — Test a credential (dry-run synthesis)
```

The router already has `loadCredential()` which reads from the `UserProviderCredential` Amplify table. Add write functions that use the same table format (owner-scoped, `credentialData` JSON string).

**A2. Implement `lib/credentials.mjs` in the router**

```javascript
// createCredential(userId, providerId, credentialData) → save to DDB
// listCredentials(userId) → return all with masked keys
// deleteCredential(userId, providerId) → remove from DDB
// testCredential(userId, providerId) → load + try a minimal synth
```

Credential format matches existing Amplify Data format:
- `owner`: `{sub}::{sub}` (Amplify owner format)
- `providerId`: e.g., `openai`
- `credentialData`: JSON string `{"apiKey":"sk-..."}` or `{"accessKeyId":"...","secretAccessKey":"...","region":"..."}`
- `status`: `active`
- `createdAtIso`, `updatedAtIso`: ISO timestamps
- `label`: provider display name

**A3. Credential test endpoint**

`POST /v1/credentials/test` — accepts `{ providerId, credentialData }` without storing it. Calls the provider adapter with a minimal "Hello" text and returns success/failure + latency. This lets users verify their key works before committing it.

**A4. Mask sensitive data in list response**

`GET /v1/credentials` returns credentials with masked values:
```json
{
  "credentials": [
    {
      "providerId": "openai",
      "label": "OpenAI",
      "status": "active",
      "authType": "api_key",
      "maskedKey": "sk-...7x9Q",
      "createdAt": "2026-03-06T12:00:00Z",
      "lastTestedAt": null
    }
  ]
}
```

### Part B: Provider Detail Pages (frontend)

**B1. Create `$lib/provider-catalog.ts`**

Aggregate provider information from:
- `provider-auth.ts` configs (auth type, fields, docsUrl, notes)
- `voices.json` catalog (voice count, languages, SSML support, quality tiers)
- New structured metadata (signupUrl, pricingUrl, pricingSummary, features)

```typescript
type ProviderDetail = {
  id: string;
  name: string;
  type: 'cloud' | 'free' | 'local';
  description: string;
  
  // Links
  websiteUrl: string;
  docsUrl: string;
  signupUrl: string;
  pricingUrl: string;
  
  // Pricing
  pricingSummary: string;          // "Free: 5M chars/mo. Then $4-$16/1M chars"
  freeTier: string | null;         // "5M characters/month for 12 months"
  paidStartsAt: string | null;     // "$4/1M characters"
  
  // Capabilities
  hasSynthesis: boolean;           // server-side adapter exists
  hasSsml: boolean;
  hasStreaming: boolean;
  hasVoiceCloning: boolean;
  authType: string;
  
  // Aggregated from catalog
  voiceCount: number;
  languageCount: number;
  qualityTiers: string[];
  genders: string[];
  
  // Features list (for display)
  features: string[];
};
```

**B2. Create `/providers/[id]/+page.svelte`**

Individual provider pages with:
- Provider header: name, type badge, connection status
- Description and key features
- **Quick setup**: inline credential form (same as `/account/providers` but contextual)
- **Voice gallery**: grid of this provider's voices with play buttons
- Pricing breakdown: free tier, paid tiers, per-character costs
- Capabilities matrix: SSML, streaming, cloning, emotion, etc.
- Links: signup, docs, pricing, API reference
- **Usage stats** (if authenticated): clips made, total chars synthesized, avg latency

**B3. Update `/docs/providers` to use dynamic data**

Replace hardcoded provider data with `provider-catalog.ts` aggregation. Show real voice counts, connection status badges, and links to `/providers/[id]`.

**B4. Enhance `/providers/[id]` with credential status**

When authenticated, show:
- ✅ Connected (key active) — with "Manage" link
- ⚠ Key expired/invalid — with "Update" action
- ❌ Not connected — with inline setup form

### Part C: Voice Detail Enrichment (frontend)

**C1. Add pricing context to voice detail**

Below the audition panel, show:
```
💰 Pricing: ~$0.016 per 1,000 characters (OpenAI tts-1-hd)
   Free tier: None for this model
   [View OpenAI pricing →]
```

Pull from `ProviderDetail.pricingSummary` and link to `pricingUrl`.

**C2. Add provider card to voice detail**

Above or beside the model card, add a compact provider card:
```
┌──────────────────────────────┐
│ OpenAI                  [→]  │
│ Cloud API · 11 voices        │
│ ✓ Connected                  │
│ [View all OpenAI voices]     │
└──────────────────────────────┘
```

Links to `/providers/openai` and `/?provider=OpenAI`.

**C3. Add "Similar voices" section**

After the model card, show 3-4 voices that share:
- Same language (primary)
- Similar quality tier
- Different provider (for comparison)

Algorithm: score by matching tags/gender/style, prefer diverse providers, exclude current voice.

**C4. Add usage stats to voice detail (authenticated)**

If the user has clips from this voice, show:
```
Your clips: 3 clips · 45KB · avg 320ms latency
[View in clip library →]
```

### Part D: Extend `provider-auth.ts` with structured data

**D1. Add structured fields**

```typescript
export type ProviderAuthConfig = {
  // ... existing fields ...
  signupUrl?: string;         // Direct link to sign up
  pricingUrl?: string;        // Direct link to pricing page
  pricingSummary?: string;    // "Free: 5M chars/mo. Then $4/1M"
  freeTier?: string;          // "5M characters/month"
  features?: string[];        // ["6 voices", "HD model", "Streaming"]
};
```

Update all 16 provider configs with these fields.

### Part E: API documentation update

**E1. Update `/docs/api` page** with credential endpoints.
**E2. Update `docs/SYNTHESIS_API.md`** with credential API reference.
**E3. Add credential examples** (cURL for create, list, delete, test).

## Files Changed

### New files
- `apps/web/src/lib/provider-catalog.ts` — Provider detail aggregation
- `apps/web/src/routes/providers/[id]/+page.svelte` — Provider detail page
- `apps/web/src/routes/providers/[id]/+page.ts` — Provider page data loader
- `infra/functions/synthesis-router/lib/credentials.mjs` — Credential CRUD for API

### Modified files
- `infra/functions/synthesis-router/index.mjs` — Add credential routes
- `infra/template.yaml` — Add credential API routes to API Gateway
- `apps/web/src/lib/synthesis/provider-auth.ts` — Add signupUrl, pricingUrl, pricingSummary, freeTier, features
- `apps/web/src/routes/voices/[id]/+page.svelte` — Add pricing context, provider card, similar voices, usage stats
- `apps/web/src/routes/docs/providers/+page.svelte` — Use dynamic provider data
- `apps/web/src/routes/docs/api/+page.svelte` — Add credential API docs
- `apps/web/src/routes/+layout.svelte` — Update nav (Providers → `/providers`)
- `docs/SYNTHESIS_API.md` — Add credential endpoints
- `docs/SCHEMA.md` — Document credential API format

## Testing

- Typecheck: `npm run check:web`
- Build: `npm run build:web`
- Unit tests: `npx --workspace apps/web vitest run`
- API tests (credential CRUD):
  ```bash
  # Store a credential
  curl -X POST https://api.vokda.iksnae.com/v1/credentials \
    -H "Authorization: Bearer vk_live_..." \
    -H "Content-Type: application/json" \
    -d '{"providerId":"openai","credentialData":{"apiKey":"sk-test"}}'

  # List credentials (masked)
  curl https://api.vokda.iksnae.com/v1/credentials \
    -H "Authorization: Bearer vk_live_..."

  # Test a credential (dry run)
  curl -X POST https://api.vokda.iksnae.com/v1/credentials/test \
    -H "Authorization: Bearer vk_live_..." \
    -H "Content-Type: application/json" \
    -d '{"providerId":"openai","credentialData":{"apiKey":"sk-real-key"}}'

  # Delete a credential
  curl -X DELETE https://api.vokda.iksnae.com/v1/credentials/openai \
    -H "Authorization: Bearer vk_live_..."
  ```
- Manual verification:
  - `/providers/openai` shows voice gallery, pricing, setup form
  - Voice detail shows pricing context, provider card, similar voices
  - Credential CRUD works via API and reflects in web UI
  - `/docs/api` includes credential endpoints

## Risks

### Breaking changes
- **None** — all new endpoints and UI additions. Existing behavior unchanged.

### Data consistency
- **Credential dual-write risk**: Web UI writes via Amplify Data (AppSync), API writes directly to DynamoDB. Both use the same table and same `owner` format (`{sub}::{sub}`), so they interoperate. However, Amplify Data has auto-generated fields (`createdAt`, `updatedAt`, `__typename`) that direct DynamoDB writes won't include. The `loadCredential` function only reads `credentialData`, so missing Amplify fields won't break synthesis — but listing in the web UI may show stale data until refresh.
- **Mitigation**: API credential writes should include all Amplify-expected fields. Add `__typename: 'UserProviderCredential'` and Amplify timestamp fields.

### Security
- **Credential test endpoint** accepts raw credentials in request body (not stored). These transit over HTTPS but are visible in Lambda logs. Must `console.log`-scrub credential data.
- **Masked list response** must never return full key values. Mask pattern: first 4 + last 4 chars.

### Auth
- All credential endpoints require authentication (same as synthesis).
- API key users (`vk_live_...`) can manage credentials — this is intentional for CLI/CI use.

## Implementation Order

1. **Part D** — Extend `provider-auth.ts` with structured data (small, no risk)
2. **Part A** — Credential API endpoints (backend, deploy + test)
3. **Part B1** — `provider-catalog.ts` aggregation module
4. **Part B2** — Provider detail pages
5. **Part C1-C2** — Voice detail pricing + provider card
6. **Part C3** — Similar voices algorithm
7. **Part C4** — Usage stats (requires clip data aggregation)
8. **Part B3-B4** — Dynamic provider list + connection status
9. **Part E** — Documentation updates

Estimated effort: ~3-4 focused sessions. Parts A and D can ship independently.
