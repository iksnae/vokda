# Feature: OpenAI refresh + cross-provider voice steerability

> Plan only — no code yet. Authored 2026-06-26.

## Motivation

Two related gaps surfaced while reviewing provider coverage:

1. **OpenAI has expanded and our integration is behind.** `gpt-4o-mini-tts` is
   now OpenAI's flagship TTS model, its headline feature is **free-text
   steerability** (an `instructions` param: tone, accent, emotion, pacing,
   whispering), and the built-in voice set grew from 11 to **13** (added
   **marin**, **cedar**). The Dec-2025 snapshot cut WER ~35% and improved
   several languages. Vokda still defaults to `tts-1` and lacks marin/cedar and
   instructions.
2. **Steerability is a cross-provider theme, not OpenAI-only.** AWS Polly
   exposes speaking styles (newscaster/conversational) via SSML and an engine
   tier (standard/neural/long-form/generative). ElevenLabs exposes
   `voice_settings` (stability, style, similarity_boost) and emotional/delivery
   controls. Vokda's differentiator — discovery + audition studio + SSML editor
   — makes a **unified "expressivity/direction" control** a natural fit.

Goal: modernize OpenAI, then expose per-provider expressivity controls wherever
the provider supports them, behind one capability-driven UI.

## Current state (file references)

| Concern | Location | Note |
|---|---|---|
| Router adapter | `infra/functions/synthesis-router/lib/adapters/openai.mjs` | defaults `model = 'tts-1'` (L17); `response_format` mp3 (L30); no `instructions` |
| Web adapter | `apps/web/src/lib/synthesis/adapters/openai.ts` | `resolveModel()` brittle substring heuristic (gpt-4o-mini-tts if sourceKey includes `gpt-4o-mini-tts`/`ballad`/`verse`, else `tts-1`); mp3 only; no `instructions` |
| Provider def | `apps/web/src/lib/providers.ts` | 11 OpenAI voice entries |
| Auth/pricing copy | `apps/web/src/lib/synthesis/provider-auth.ts` | L63/66 pricing + model notes |
| Catalog | `apps/web/static/data/voices.json` | 11 OpenAI voices: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse — **missing marin, cedar** |
| Request type | `apps/web/src/lib/synthesis/types.ts` | `SynthesisRequest` has no `instructions`/`style` field |
| SSML editor | `apps/web/src/lib/ssml/*` | related expressivity surface, but provider-native steering is distinct |
| Sample gen | `scripts/generate-samples.mjs`, `generate-all-samples.mjs` | used to mint catalog samples |
| Catalog publish | `scripts/publish-catalog.mjs` + `npm run check:catalog` | adding voices requires republish; CI guard enforces freshness |

## Plan

### Part 1 — OpenAI modernization

**A. Model resolution (S).** Make `gpt-4o-mini-tts` the default and keep
`tts-1`/`tts-1-hd` selectable. Replace the substring heuristic in
`openai.ts:resolveModel()` and the hardcoded default in `openai.mjs` with
explicit per-voice/model metadata (a voice declares which models can render
it). marin/cedar are `gpt-4o-mini-tts`-only; tts-1/tts-1-hd support the older
9-voice subset (alloy, ash, coral, echo, fable, onyx, nova, sage, shimmer).

**B. New voices marin + cedar (M).** Add catalog entries (gpt-4o-mini-tts
only), generate audio samples via the OpenAI provider (Connected on the
account), then regenerate the published catalog (`publish-catalog.mjs`) and
commit — the `check:catalog` CI guard will enforce it. Backfill metadata
(gender/age presentation, tags) the same way as existing voices.

**C. Output formats (XS, optional).** Optionally expose wav/opus/flac
(`/v1/audio/speech` supports mp3/opus/aac/flac/wav/pcm). Low priority; the
durationMs parser already handles mp3 + wav.

### Part 2 — Cross-provider steerability ("Expressivity")

**D. Unified request field (M).** Add optional steering input to
`SynthesisRequest` (`types.ts`) — a small discriminated shape, not a single
string, since providers differ: free-text `instructions`, an enum `style`, and
numeric `settings`. Thread it through the synthesis service → both adapters
(web + router). Adapters that don't support steering ignore it gracefully.

**E. Capability metadata (part of L).** Each voice/provider declares what
steering it supports, so the UI knows what control to render and what's valid:

| Provider | Mechanism | Surface to map onto |
|---|---|---|
| **OpenAI** (`gpt-4o-mini-tts`) | free-text `instructions` param | text box; gpt-4o-mini-tts only |
| **AWS Polly** | SSML speaking styles + engine tier | `style` enum → SSML `<amazon:domain>`: newscaster (Matthew/Joanna en-US, Lupe es-US, Amy en-GB), conversational (Matthew/Joanna); `engine` standard/neural/long-form/generative. Note: generative ≠ newscaster; styles are voice-specific |
| **ElevenLabs** | `voice_settings` + emotional/delivery | sliders: stability, style, similarity_boost, use_speaker_boost; verify current audio-tag/emotional API |
| Gemini / Cartesia / LMNT | varies | future — note, don't build yet |

**F. Per-adapter mapping (M each).** Each adapter translates the unified input
to its native mechanism: OpenAI → `instructions`; Polly → wrap text in the
right SSML / set `Engine`; ElevenLabs → `voice_settings`. Encapsulate the
capability matrix so it's the single source of truth for both validation and
UI.

**G. Audition UI (M).** In the voice-detail audition studio
(`apps/web/src/routes/voices/[id]/`), render an "Expressivity / Direction"
control whose form is driven by the voice's capability descriptor — free-text
for OpenAI, a style dropdown for Polly, sliders for ElevenLabs — and hidden
entirely when the voice supports none. Keep it adjacent to (not merged with)
the SSML editor.

## Data-model changes

- `types.ts`: `SynthesisRequest.steering?` (discriminated: `{instructions}` |
  `{style}` | `{settings}`); per-voice/provider capability fields.
- No Amplify schema change needed for ad-hoc auditions; if we persist steering
  on saved clips, add a field to the `SynthesisJob` model.

## Acceptance criteria

- OpenAI default model is `gpt-4o-mini-tts`; marin + cedar are in the catalog
  with real samples; `npm run check:catalog` and `npm run check:web` pass.
- A unified steering field flows end-to-end. Audible/observable effect:
  OpenAI `instructions` change delivery; Polly newscaster/conversational apply
  on supported voices; ElevenLabs settings apply.
- The audition UI shows the correct control per voice capability and hides it
  when unsupported. No type errors; tests cover the capability mapping.

## Out of scope

- OpenAI Custom Voices / brand voices; OpenAI Realtime API voice models;
  voice cloning. (Catalog/synthesis focus only.)

## Risks / open questions

- **Polly steering is voice- and engine-specific** — only certain voices
  support newscaster/conversational, and generative excludes newscaster. The
  capability matrix must be exact or the UI will offer invalid combinations.
- **ElevenLabs** emotional/audio-tag surface should be verified against the
  current API (may differ from classic `voice_settings`).
- **Model/voice compatibility**: marin/cedar are gpt-4o-mini-tts-only; guard
  against rendering them on tts-1.
- **Sample regeneration cost**: minting marin/cedar samples spends OpenAI quota
  and requires a `publish-catalog` republish (now CI-guarded).
- **Related finding (provider validity):** the account's `aws-polly` BYOK key
  is currently **invalid** (`UnrecognizedClientException` on a live synth),
  even though `/account/providers` shows it "Connected" — that badge means
  "key stored", not "key valid" (only **Test Connection** validates). Testing
  Polly steering needs a valid key; consider surfacing real validity (auto
  Test Connection / status reflecting last test) as a small adjacent fix.

## Effort & sequencing

1. **A + B** — OpenAI model default + marin/cedar (S + M). Self-contained, quick value.
2. **D + E + F(OpenAI) + G** — steering core + OpenAI instructions (richest, simplest mapping) + capability-driven UI (L).
3. **F(Polly)** — SSML styles/engine mapping (M).
4. **F(ElevenLabs)** — voice_settings/emotional mapping (M).

Sources: OpenAI TTS guide & "next-generation audio models" announcement; AWS
Polly generative-voices / newscaster / conversational docs; ElevenLabs voice
settings docs (verify current).
