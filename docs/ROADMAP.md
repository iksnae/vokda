# Vokda Roadmap

> See [VISION.md](./VISION.md) for the full product vision.
> See [ARCHITECTURE.md](./ARCHITECTURE.md) for current system architecture.

Vokda has two parallel tracks that evolve together:

- **Discovery Track** — the voice catalog, browsing experience, collections, synthesis, and audio
- **Hub Track** — industry news, model tracking, reviews, and guidance

---

## Current State (March 2026)

### ✅ Shipped

**Catalog & Discovery**
- 550 voices across 25 providers in 53 languages
- All 550 voices have real generated audio samples (100% coverage)
- Pinterest-style browse grid with 11 filters, all URL-synced
- Search across name, provider, description, tags, gender, accent, style
- Voice detail pages with custom audio player, collapsible model card
- Collections — pin, organize, export as Voice Pack JSON
- Favorites system

**Synthesis & Audition**
- Server-side synthesis API with 9 provider adapters (OpenAI, ElevenLabs, Deepgram, Gemini TTS, Cartesia, LMNT, GCP TTS, Azure Speech, AWS Polly)
- SSML visual editor with 7 tags, attribute popovers, real-time validation, provider-aware tag availability
- Three-gate audition: auth gate → provider setup guide → full audition UI
- BYOK (Bring Your Own Key) — users store their own provider API keys
- Audio clip library with full CRUD (name, tags, description, re-synthesize, download, delete, search)
- Contextual provider setup guidance per provider type (API, free, local model)

**Auth & Infrastructure**
- Cognito auth live (sign up/in/confirm), role hierarchy: visitor → guest → curator → admin
- Vokda API keys for programmatic access (`vk_live_...`)
- Custom API domain: `api.vokda.iksnae.com`
- SAM-deployed serverless stack (Lambda + API Gateway + S3 + DynamoDB)
- Amplify Gen2 backend (Cognito + AppSync + 10 DynamoDB tables)
- 5 GB per-user storage quota with tracking
- 178 unit tests passing

**Curation**
- Curation workspace for metadata enrichment (curator+)
- Voice draft creation system
- Admin panel for user role management

### ⚠️ Known Gaps

- Amplify Data (DynamoDB) scaffolded but favorites/collections still in localStorage — not persisted cross-session
- ElevenLabs free tier key flagged — needs upgrade or different key
- Metadata quality varies: original 12 seed voices have editorial labels; bulk-added voices have sparser metadata
- No industry hub content yet (Phase 3)

---

## Phase 1 — Catalog Quality & Polish (Active)

**Goal:** Make the catalog reliable, metadata-rich, and pleasant to use.

### 1a. Metadata Enrichment
- [ ] Enrich `shortLabel` for bulk-added voices (replace generic "en-US female voice")
- [ ] Fill `toneTags`, `useCases`, `audienceTags` for sparse-metadata voices
- [ ] Standardize `metadataQuality` across catalog (`sparse` → `curated` → `editorial`)
- [ ] Add `genderPresentation`, `accent`, `speakingStyle` where missing

### 1b. Persistent Data
- [ ] Wire Amplify Data end-to-end: favorites and collections sync to DynamoDB
- [ ] Migrate localStorage state to Amplify Data on first sign-in
- [ ] Collection sharing (public link to a curated voice set)

### 1c. Audio & Playback
- [ ] CDN-host audio samples (currently static assets — won't scale beyond ~1,000)
- [ ] Add multiple sample scripts per voice (conversational, narration, formal)
- [x] Track clip duration (`durationMs`) — server-side, derived from rendered audio (MP3/WAV) in the synthesis router & worker
- [ ] Fix: Google Cloud TTS samples with restricted API key

### 1d. UX Polish
- [ ] Voice ranking / featured order (not just insertion order)
- [ ] Mobile bottom action bar on detail pages
- [ ] Loading states and skeleton screens for async operations
- [ ] Empty state improvements across all pages

---

## Phase 2 — Discovery Experience

**Goal:** Make Vokda genuinely delightful for finding the right voice.

### 2a. Discovery Features
- [x] "Similar voices" on detail page (by language/gender/age/quality/tags)
- [ ] Comparison mode — pick 2-3 voices, hear them speak the same text
- [ ] Mood/use-case browse pages ("Voices for audiobooks", "Voices for gaming NPCs")
- [ ] Voice Finder wizard — answer questions, get a shortlist
- [x] Per-provider pages (`/providers/[id]`) — counts, pricing, voice gallery, connect CTA

### 2b. Synthesis Enhancements
- [x] Synthesis parameter controls + voice steerability — OpenAI `instructions`, ElevenLabs `voice_settings`+v3 audio tags, AWS Polly newscaster; capability surfaced per voice in the `/v1/voices` `steering` field
- [ ] Streaming synthesis for low-latency providers (Cartesia, LMNT)
- [x] Batch synthesis — `POST /v1/synthesize/batch` (up to 50 jobs)
- [ ] Clip waveform visualization
- [ ] Clip sharing (public presigned URL)

### 2c. SSML Editor v2
- [ ] Syntax highlighting in textarea (or switch to CodeMirror)
- [ ] Provider-specific SSML template library
- [ ] SSML diff view (before/after tag changes)
- [ ] Amazon/Microsoft extension tags in toolbar

---

## Phase 3 — Industry Hub

**Goal:** Make Vokda the place you go to stay current on TTS.

> Architecture detail: [specs/hub-architecture.md](./specs/hub-architecture.md)

### 3a. Hub Content (New Repo: `vokda-hub`)
- [ ] Bootstrap `iksnae/vokda-hub` with Jekyll + GitHub Pages
- [ ] Provider profiles for all 25 current providers
- [ ] Model profiles for major open-source models
- [ ] Seed 5-10 news posts (model releases, industry updates)
- [ ] 3+ guides ("Choosing a TTS provider", "SSML best practices", "Open-source TTS overview")

### 3b. SvelteKit Hub Integration
- [ ] `/hub` route consuming Jekyll JSON feeds
- [ ] Provider profile deep-links from voice detail pages
- [ ] Model profile deep-links from open-model voice cards
- [ ] Nav restructure: Voices | Hub | Account

### 3c. Reviews & Ratings
- [ ] `VoiceReview` model in Amplify Data
- [ ] Review UI on voice detail page (curator+ can post)
- [ ] Aggregate quality scores: naturalness, expressiveness, consistency
- [ ] Benchmark data (MOS scores, latency, cost/character)

---

## Phase 4 — Platform & API

**Goal:** Make Vokda useful as infrastructure, not just a discovery surface.

### 4a. Public API
- [x] OpenAPI spec with `components/schemas` for the catalog API (served at `/api/v1/openapi.json`); full synthesis spec pending
- [x] `GET /v1/voices` — account-scoped filterable catalog endpoint (provider, language, gender, quality, search, pagination)
- [x] `GET /v1/voices/:id` — voice detail + samples, variants, model card
- [x] `GET /v1/providers` — provider registry (account-enabled by default, `?all=true` for full catalog)
- [ ] Rate limiting tiers (free / pro)

### 4b. Ingestion Pipeline
- [ ] Automated provider sync (scheduled Lambda, diff against catalog)
- [ ] HuggingFace model scanner (quality-gated)
- [ ] Admin review queue for newly discovered voices
- [ ] Sample regeneration pipeline

### 4c. Developer Tools
- [ ] Vokda CLI — search voices, synthesize, manage clips from terminal
- [ ] Voice Pack format v2 — structured for agent/pipeline configs
- [ ] Embed widgets — drop a voice player onto any site
- [ ] Webhook notifications (new voice, model release, provider update)

---

## Out of Scope (For Now)

- Voice cloning / custom voice creation
- Real-time streaming synthesis (WebSocket)
- Multi-language UI localization
- Mobile native app
- Social features (follow curators, share reviews)
- Monetization / marketplace

These may become relevant later, but aren't on the path to making Vokda the trusted TTS destination.
