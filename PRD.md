# PRD: Vokda (Vocal Database)

## 1. Purpose

Vokda is a web app that demonstrates a **marketplace-style browsing and curation experience** for TTS voices across:

* major cloud providers (e.g., AWS Polly, Azure, Google, ElevenLabs)
* open models (e.g., Qwen3-TTS, KittenTTS)
* Hugging Face hosted sources (Models, Spaces, Inference Endpoints/Providers)

Core user journey: **Browse → Audition → Curate (Collections/Cart) → Export (Voice Pack)**.

Vokda is not primarily a monetized marketplace; it’s a **reference experience** that normalizes voice discovery and “checkout-like” exporting.

---

## 2. Goals and Non-goals

### Goals

* Normalize heterogeneous voice sources into a single **catalog** with consistent metadata, tags, and capabilities.
* Provide a fast, delightful **voice discovery UX** with auditioning.
* Support a “checkout” style **Cart** and **Export** flow producing portable bundles for downstream use.
* Make open-model voices first-class via:

  * HF Models ingestion (metadata)
  * HF Spaces (preview/audition)
  * HF Endpoints / self-hosted (runnable/exportable)

### Non-goals (initial)

* Payments, revenue share, payouts, creator monetization
* Voice cloning / user-generated voice uploads (can be future)
* Real-time streaming synthesis as a requirement (nice-to-have)
* Perfect SSML compatibility across all sources (best-effort normalization)

---

## 3. Target Users

* **Builders**: devs/teams wanting to integrate or compare voices across sources
* **Creators**: writers, filmmakers, podcasters auditioning narration/character voices
* **Curators**: internal teams building a “house voice set” for projects

---

## 4. Core Concepts

### 4.1 Voice vs Variant

* **Voice**: a curated “product-like” entry (persona + metadata + tags + samples)
* **Variant**: a specific runnable or preview target (e.g., Polly voice, Azure voice, HF Endpoint deployment, HF Space)

### 4.2 Source Types

* `cloud_provider` (Polly/Azure/etc.)
* `hf_model` (metadata; runnable depends on deployment)
* `hf_space` (preview/audition; not guaranteed stable)
* `hf_endpoint` (runnable; best for export)
* `self_hosted` (runnable in user infra; export includes deployment recipe)

### 4.3 Export Artifact: Voice Pack

A portable bundle that includes:

* selected voices + selected variants
* capability snapshots
* sample scripts used
* adapter references (no secrets)
* generated code snippets (Node v20+)
* licensing notes for each item

---

## 5. User Journeys

### 5.1 Browse and audition

1. User lands on Catalog
2. Filters by language, vibe tags, quality tier, source type
3. Opens Voice detail
4. Plays standard samples
5. Optionally generates a quick preview with custom text (if variant runnable)

### 5.2 Curate into collections

1. User saves voice to **Collection** (e.g., “Noir Narrators”, “Youth Characters”)
2. Adds notes/tags (private)
3. Shares collection link (optional)

### 5.3 Checkout-like cart + export

1. User adds selected voices/variants to Cart
2. Cart shows compatibility and warnings (SSML support, max chars, licensing unknown)
3. User exports **Voice Pack**:

   * `voice-pack.json`
   * Node v20 snippet(s)
   * optional: self-host recipe stubs for open models

---

## 6. Functional Requirements

### 6.1 Catalog

* List view:

  * voice name, tags, languages, tier, top source badges
  * “play sample” inline where available
* Detail view:

  * variants list with badges: runnable/preview-only, SSML, formats
  * samples (standard scripts)
  * “Try text” (for runnable variants)
  * licensing panel (allowed use + notes)
* Search:

  * full-text over name/tags/description
  * filters:

    * language/locale
    * source type (cloud/HF model/HF endpoint/HF space/self-host)
    * runnable only
    * quality tier
    * supports SSML
    * output format

### 6.2 Curation

* Create/edit/delete Collections
* Add/remove voices to Collections
* Add curator notes per voice in a collection
* Featured lists (admin-only): curated home page shelves

### 6.3 Cart

* Add a specific **variant** (not just the voice) to Cart
* Cart item includes:

  * voice label + variant source
  * quick warnings (licensing unknown, preview-only, SSML unsupported)
* “Resolve variant” helper:

  * if a voice has multiple variants, user picks the preferred one (e.g., HF endpoint over space)

### 6.4 Export

* Generate Voice Pack with:

  * all voice + variant metadata
  * cart items
  * snippets:

    * `voice-pack.json`
    * TypeScript helper + “how to synthesize” stubs
* Export must redact secrets:

  * do not export API keys or tokens
  * use env var placeholders (`HF_TOKEN`, `AZURE_KEY`, etc.)

### 6.5 Ingestion / Normalization

* Provider connectors (initial: 1–2 cloud + HF):

  * scheduled ingestion job to refresh voices
  * diffing logic:

    * new entries
    * changed fields/capabilities
    * deprecated/removed
* HF ingestion (initial):

  * ingest curated allowlist + optional discovery mode
  * import:

    * HF Models tagged TTS (metadata)
    * HF Spaces used for demos (preview-only)
    * HF Endpoints (runnable; preferred)
* Normalization rules:

  * canonical language tags (BCP-47)
  * canonical format set: mp3/wav/pcm
  * SSML supported flag (best effort)
  * max input chars per variant

### 6.6 Synthesis Gateway (for preview + sample generation)

* A single internal API that:

  * takes `{variantId, input(text|ssml), format, settings}`
  * routes to adapter by `sourceKey`
  * enforces constraints (max chars, format support)
  * returns audio (prefer URL)
* Sample generation pipeline:

  * standard scripts rendered for runnable variants
  * uploads audio to object storage + CDN URL saved to samples

---

## 7. Admin Requirements

* Admin dashboard:

  * approve/feature voices
  * edit tags/descriptions
  * mark variant as preview-only/runnable
  * manage “curated allowlist” of HF models/spaces
  * trigger sample regeneration
* Content integrity:

  * blocklist sources
  * annotate licensing warnings

---

## 8. Data Model (MVP-level)

* `Voice`
* `VoiceVariant`
* `VoiceSample`
* `Collection`
* `CollectionItem` (voice + curator notes)
* `Cart` (or stored client-side + export server-side)
* `IngestionRun` / `IngestionDiff` (optional but recommended)

IDs: ULIDs.

---

## 9. API Surface (initial)

* `GET /voices` (search + filters)
* `GET /voices/:voiceId`
* `POST /synthesize` (preview; requires runnable variant)
* `POST /cart/export` (returns Voice Pack)
* `GET/POST/PUT/DELETE /collections...` (if authenticated)
* `POST /admin/ingest/run` (admin)
* `POST /admin/samples/regenerate` (admin)

---

## 10. UX Requirements

* Near-instant catalog browsing (cache + pagination)
* Audio player consistent across pages
* Clear badges:

  * Runnable / Preview-only
  * SSML supported
  * “Export-ready” (HF endpoint or stable provider)
* Warning patterns:

  * licensing unknown
  * preview-only instability
  * SSML will be stripped
* “Shelf” style home page:

  * Featured Narrators
  * Character Voices
  * Open Models Showcase
  * Multilingual

---

## 11. Technical Requirements

* Node v20+ (services/tools)
* TypeScript across backend/frontend
* Adapter registry architecture (sourceKey → adapter)
* JSON Schemas + runtime validation (Ajv)
* Object storage for samples (S3-compatible)
* Observability:

  * per-adapter error rates
  * latency
  * ingestion job status

---

## 12. Security & Compliance (MVP)

* No secret export
* Rate limiting on preview synthesis
* Abuse controls:

  * text length limits
  * content throttles
* Licensing capture:

  * record model license string where available
  * required “notes” field for every voice

---

## 13. MVP Scope

**Must ship**

* Catalog browse/search/filter
* Voice detail with samples
* Basic collections (optional if time; cart is higher priority)
* Cart + export (Voice Pack)
* Ingestion:

  * HF allowlist (models/spaces)
  * 1 cloud provider
* Preview synthesis:

  * cloud provider runnable
  * HF endpoint runnable (if configured)
* Sample generation for runnable variants

**Cut if needed**

* user accounts (keep anonymous + local collections)
* full discovery ingestion of all HF TTS models (stick to curated allowlist)
* advanced analytics dashboards

---

## 14. Success Metrics

* Time to find a suitable voice (median < 2 minutes)
* Export completion rate (browse → export)
* Playback reliability (sample playback error rate)
* Ingestion health (jobs succeed, diffs tracked, deprecations handled)

---

## 15. Milestones

1. **Foundation**

   * schemas + adapter registry
   * basic catalog UI with seeded data
2. **Ingestion v1**

   * HF allowlist importer
   * 1 cloud connector
3. **Synthesis Gateway v1**

   * preview for runnable variants
4. **Samples Pipeline**

   * standard scripts → stored samples
5. **Cart + Export**

   * Voice Pack + snippets
6. **Admin Curation**

   * tags, featured shelves, allowlist mgmt

