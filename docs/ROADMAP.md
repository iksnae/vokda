# Vokda Roadmap

> See [VISION.md](./VISION.md) for the full product vision.

Vokda has two parallel tracks that evolve together:

- **Discovery Track** — the voice catalog, browsing experience, collections, and audio
- **Hub Track** — industry news, model tracking, reviews, and guidance

---

## Current State (March 2026)

**Shipped:**
- 130 voices across 7 providers (AWS Polly, Azure Speech, Google Cloud TTS, OpenAI, ElevenLabs, Kokoro 82M, Qwen3 TTS)
- 128 voices with real generated audio samples
- Pinterest-style browse grid with play, favorite, pin, and filter
- Voice detail page with custom audio player
- Collections — pin, organize, export as Voice Pack JSON
- Curation workspace for metadata enrichment
- Auth scaffolded (Amplify Cognito): visitor → guest → curator → admin
- Local TTS via mlx-audio (Kokoro + Qwen3 on Apple Silicon)
- AWS Amplify deployment (main → prod, PRs → preview envs)

**Not yet built:**
- Persistent saves (auth wired but not end-to-end)
- Real synthesis (adapters return mock/pre-generated audio)
- Industry news feed
- Model tracking / release monitoring
- Reviews and ratings
- Guidance content
- Cartesia, PlayHT, Fish Audio, Hume providers

---

## Phase 1 — Catalog Quality (Active)

**Goal:** Make the existing 130 voices actually discoverable and trustworthy.

### 1a. Metadata Enrichment
- [ ] Enrich `shortLabel` for all bulk-added voices (currently generic: "en-US female voice")
- [ ] Enrich `toneTags`, `useCases`, `audienceTags` for voices added via mass discovery
- [ ] Standardize `metadataQuality` field across catalog (`sparse` → `curated` → `editorial`)
- [ ] Add `genderPresentation`, `accent`, `speakingStyle` where missing

### 1b. Catalog Coverage Gaps
- [ ] Add Cartesia voices (ultra-low latency, real-time capable — high priority)
- [ ] Add PlayHT voices (large library, cloning API)
- [ ] Add Fish Audio voices (open-source friendly)
- [ ] Add Hume AI (emotional TTS)
- [ ] Run real Google Cloud TTS synthesis (currently using OpenAI fallback audio)
- [ ] Fix OpenAI `ballad` and `verse` (missing samples — use gpt-4o-audio-preview)

### 1c. Audio Sample Quality
- [ ] Standardize sample transcript across all voices (current: inconsistent per-voice)
- [ ] Add multiple sample scripts per voice (e.g., conversational, narration, formal)
- [ ] CDN-host audio samples (currently bundled as static assets — won't scale)

---

## Phase 2 — Discovery Experience

**Goal:** Make Vokda genuinely delightful to browse and use.

### 2a. Catalog UX Polish
- [ ] Voice ranking / featured order (not just insertion order)
- [ ] "Similar voices" on detail page
- [ ] Mood/use-case browse pages (e.g., "Voices for audiobooks", "Voices for gaming NPCs")
- [ ] Comparison mode — pick 2-3 voices and hear them speak the same text
- [ ] Mobile bottom action bar on detail pages

### 2b. Persistent Collections (Auth)
- [ ] Wire Amplify Cognito auth end-to-end (saves currently in localStorage only)
- [ ] Sync favorites and collections to Amplify Data (DynamoDB)
- [ ] Collection sharing (public link to a curated voice set)
- [ ] Default "Favorites" built-in collection (merge favorites into collections system)

### 2c. Live Audition
- [ ] Real-time synthesis on voice detail page (type any text, hear it in that voice)
- [ ] Wire cloud provider adapters: AWS Polly, Azure Speech, OpenAI TTS, ElevenLabs
- [ ] Rate limiting and auth gate for synthesis (guest tier+)
- [ ] SSML support toggle in audition panel

---

## Phase 3 — Industry Hub

**Goal:** Make Vokda the place you go to stay current on TTS.

> Architecture detail: see [docs/specs/hub-architecture.md](./specs/hub-architecture.md)

**Hub is a two-piece system:**
- `iksnae/vokda-hub` — separate Jekyll repo for editorial content (news, guides, provider & model profiles)
- `iksnae/vokda` — SvelteKit consumes Jekyll JSON feeds; adds in-app `/hub` route and auth-gated reviews

### 3a. `vokda-hub` Jekyll Repo (new repo)
- [ ] Bootstrap `iksnae/vokda-hub` with Jekyll + GitHub Pages deploy
- [ ] Set up `_posts`, `_providers`, `_models`, `_guides`, `_data` structure
- [ ] Configure `api/news.json` and `api/models.json` Liquid templates (consumed by SvelteKit)
- [ ] Seed: 3-5 news posts, provider profiles for all 7 current providers, 2 guides
- [ ] Deploy to `hub.vokda.iknsae.com` via GitHub Pages CNAME

### 3b. SvelteKit Hub Integration
- [ ] Add `/hub` route — fetches Jekyll JSON feed, renders news + featured guide
- [ ] Rename "Explore" → "Voices" in nav; add "Hub" nav link
- [ ] Provider profile deep-links on voice detail pages ("About ElevenLabs →")
- [ ] Model profile deep-links from open-model voice cards

### 3c. Model & Provider Registry
- [ ] `_providers/` profiles: feature matrix, pricing tiers, SSML support, latency
- [ ] `_models/` profiles: HuggingFace link, license, benchmarks, known limitations
- [ ] `_data/benchmarks.yml` — MOS scores, cost/char, latency (manually curated)
- [ ] Model registry page on hub site

### 3d. Reviews & Ratings (Amplify)
- [ ] `VoiceReview` model in Amplify Data schema
- [ ] Review UI on voice detail page (curator+ can post)
- [ ] Aggregate quality scores: naturalness, expressiveness, consistency, use-case fit
- [ ] `SavedArticle` model — users can bookmark hub articles

### 3e. Guidance Content
- [ ] "Voice Finder" — answer a few questions, get a shortlist (SvelteKit interactive)
- [ ] Use-case guide pages in Jekyll `_guides/`
- [ ] Provider comparison guides (ElevenLabs vs OpenAI, cloud vs open-source)
- [ ] Pricing context page

---

## Phase 4 — Platform & API

**Goal:** Make Vokda useful as infrastructure, not just a discovery surface.

### 4a. Backend API
- [ ] `GET /voices` — filterable catalog endpoint
- [ ] `POST /synthesize` — proxy synthesis through Vokda (normalized API across providers)
- [ ] `GET /voices/:id/samples` — stream audio samples from CDN
- [ ] Webhook support for new voice/model notifications

### 4b. Ingestion Pipeline
- [ ] Automated provider sync (run discovery scripts on schedule, diff against catalog)
- [ ] HuggingFace model scanner (watch for new TTS models meeting quality bar)
- [ ] Admin review queue for newly discovered voices before they go live
- [ ] Sample regeneration pipeline (re-generate audio when model updates)

### 4c. Developer Tools
- [ ] Vokda CLI — search voices, download samples, export packs from terminal
- [ ] Voice Pack format v2 — structured for direct use in agent/pipeline configs
- [ ] Embed widgets — drop a voice player onto any site
- [ ] API keys for programmatic access

---

## Out of Scope (For Now)

- Voice cloning / custom voice creation
- Real-time streaming synthesis
- Multi-language UI localization
- Mobile native app
- Social features (follow curators, share reviews)
- Monetization / marketplace

These may become relevant later, but aren't on the path to making Vokda the trusted TTS hub.
