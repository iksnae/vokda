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

### 3a. News Feed
- [ ] Curated TTS news feed (blog posts, releases, research papers, product updates)
- [ ] RSS ingestion pipeline for major provider blogs and HuggingFace model releases
- [ ] Editorial tagging (provider, topic, significance)
- [ ] Weekly digest email/notification for signed-in users

### 3b. Model Tracking
- [ ] Provider and model registry with release dates, changelog, and status
- [ ] New model detection (automated scan of HuggingFace, provider APIs)
- [ ] Model comparison history (track quality changes across versions)
- [ ] Benchmark tracking (MOS scores, latency, cost-per-character)

### 3c. Reviews & Ratings
- [ ] Curator and editorial voice reviews (not crowdsourced — opinionated)
- [ ] Quality scores: naturalness, expressiveness, consistency, latency
- [ ] Use-case fit ratings (narration, assistant, character, news, etc.)
- [ ] Community upvotes on voices (simple signal, not full reviews)

### 3d. Guidance
- [ ] "Voice Finder" — answer a few questions, get a shortlist
- [ ] Use-case guides ("Best voices for podcast intros", "Choosing a voice for your AI agent")
- [ ] Provider comparison pages (AWS Polly vs Azure Speech, ElevenLabs vs OpenAI)
- [ ] Pricing context (cost-per-character for each provider)

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
