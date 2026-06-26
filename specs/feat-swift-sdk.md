# Feature: Vokda Swift SDK (revised)

> Plan only — no code yet. Authored 2026-06-26, **revised** after an adversarial
> review of the first draft. The revision addresses the three load-bearing
> problems that review surfaced: an under-justified package premise, hand-waved
> model drift, and backwards generation sequencing.

## Prerequisite status (2026-06-26)

- ✅ The **catalog** OpenAPI now ships `components/schemas` (PR #20) — the served
  `/api/v1/openapi.json` is codegen-ready for the public catalog surface.
- ❌ The **authenticated synthesis** spec (keys, credentials, synthesize, clips)
  exists only in `scripts/generate-api-catalog.mjs` and is **not served**.
  Publishing it is a prerequisite for generating the authed client (below).

## 1. Premise — why a package, and which surface

**Confirmed consumer & surface.** khaos.machine.x consumes **`GET /api/voices`**
— the *authenticated* synthesis API (it returned 371 voices and 401'd without a
key; that's how #11 was filed), **not** the public static catalog. So the SDK's
primary path is the **authed `VokdaClient` + `/v1/voices`**, not the catalog
client. The first draft over-indexed on the static catalog; this corrects it.

**Boundary justification.** One internal consumer alone doesn't justify a
separately-released package. Two things do: (a) Vokda already ships a TS SDK as a
deliberate public surface — a Swift peer is consistent; (b) the apex/`api.` host
split + auth + typed errors are real logic worth centralizing (it's what #11's
client-side shim worked around). **Decision:** build the package, but treat the
catalog client as generated and the authed client as the hand-written core (see
§2) so we're not maintaining a second full type set by hand.

## 2. Model drift — decided, not deferred

The first draft said "generate later" — a hope, not a control. Decision:

- **Catalog models/client: generated** from the now-published catalog OpenAPI
  via `swift-openapi-generator`. No hand-maintained duplicate of those types.
- **Authed (synthesis) models/client: hand-written** *until* the full synthesis
  OpenAPI is published, then migrated to generation. To stop the hand-written
  models from silently drifting, add a **CI contract test** that decodes
  **recorded real responses** (fixtures captured from the live API) for every
  authed endpoint and fails on any schema mismatch. Drift becomes a red build,
  not a production surprise.
- **Sequencing (corrected — generation-first where possible):**
  1. **Publish the full synthesis OpenAPI** (extend `publish-catalog.mjs`/shared
     builder to emit the authed paths+schemas, or serve `generate-api-catalog`'s
     spec). Independently valuable (docs, TS SDK, this SDK).
  2. **Generate** the catalog client now (schemas exist).
  3. Hand-write the thin authed client + contract test; migrate to generation
     once step 1 lands.

## 3. The three payload shapes (promoted from a footnote)

This is where the modeling work and bugs live, so it's front-and-center:

- **`/api/v1/voices.json`** (static catalog) — full list objects, public.
- **`/v1/voices`** (authed API) — **summary** shape (`formatVoiceSummary`):
  id, name, provider, providerId, gender, age, qualityTier, tags, toneTags,
  `audioUrl` (absolute apex after #11), ssmlSupport.
- **`/v1/voices/{id}`** (authed API) — **detail** shape (`formatVoiceDetail`):
  summary + imageUrl, licenseNotes, metadata, modelCard, samples[], variants[].

The Swift models must mirror **these three distinct shapes** exactly (the
consumer uses the authed summary/detail, not the static catalog). `Voice`
should not be one fuzzy struct — model `VoiceSummary` and `VoiceDetail`
explicitly.

## 4. Decisions the draft deferred

- **Dates: keep ISO-8601 `String`** on the wire-facing models (matches the API
  exactly, lossless) and expose computed `var ...Date: Date?` accessors. No
  ambiguous decode strategy.
- **Platform floor:** confirm against khaos.machine.x's deployment target before
  fixing `Package.swift` platforms (still the one open input).
- **Auth/secrets:** the SDK takes a key string; storing it (Keychain) is the
  caller's responsibility — documented, not handled by the SDK.

## Design (unchanged essentials)

- `VokdaCatalogClient` (public, apex base) + `VokdaClient` (authed, `api.` base,
  Bearer) mirroring the TS SDK surface (~20 methods). The **host split is a
  feature** (it's the root of #11).
- `Sendable` structs; `async throws` over an injected `URLSession`;
  `VokdaAPIError(status, body)`.
- Tests: `URLProtocol` stub for unit tests (request shape, host split, auth
  header, decoding, error mapping) **plus** the §2 contract test against
  recorded fixtures.

## Packaging

Separate repo **`iksnae/vokda-swift`** (SwiftPM consumes by Git URL). Trade-off
acknowledged: a separate repo loses the in-pipeline drift gate the in-repo TS
SDK could have — the §2 contract test is the compensating control.

## Acceptance criteria

- Full synthesis OpenAPI published (step 1) before the authed client is
  finalized.
- `swift build`/`swift test` green; method + host-split + auth parity with the
  TS SDK; the three voice shapes modeled distinctly.
- Contract test decodes recorded real responses for every authed endpoint.
- Tagged SwiftPM package with a README mirroring `packages/sdk`.

## Out of scope

Custom Voices, Realtime API, voice cloning, streaming, Combine wrappers.

## Effort & sequencing (re-pointed — multi-day, not "a day or two")

1. **Publish full synthesis OpenAPI** (shared builder) — **M**.
2. Generate catalog client + models — **S–M**.
3. Hand-write authed client + recorded-fixture contract test — **M–L**.
4. New repo + CI matrix + README + tag — **M**.

Total ≈ several focused days. The first draft's "a day or two" ignored the new
repo/CI, the three-shape modeling, and the contract test.
