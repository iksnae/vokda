# Feature: Voice steerability — ElevenLabs

> Plan only — no code yet. Authored 2026-06-26. Extends the steerability model
> (`provider-steering.ts`) to ElevenLabs. Grounded in live ElevenLabs docs
> research (June 2026).

## Headline

ElevenLabs has the **richest** steering surface of the three providers — two
distinct facets:
1. **`voice_settings`** — numeric sliders (stability, similarity, style, speaker
   boost, speed). Works on all models.
2. **Audio tags** — inline `[whispers]`/`[excited]`/`[laughs]` stage directions
   in the text. **`eleven_v3` only** (GA as of Feb 2026).

Capability therefore depends on the **model**, not just "provider = ElevenLabs".

## Researched API surface (ElevenLabs docs, June 2026)

**`POST /v1/text-to-speech/{voice_id}`** — header `xi-api-key`. Steering body fields:
- `model_id` (default `eleven_multilingual_v2`).
- `voice_settings`: `stability` (0–1, def 0.5), `similarity_boost` (0–1, def 0.75),
  `style` (0–1, def 0.0 — non-zero adds latency), `use_speaker_boost` (bool, def
  true), `speed` (0.25–4.0 REST, def 1.0).
- `text` — audio tags live **inline here**.

**Models & capabilities:**
| model_id | Audio tags | Streaming | Notes |
|---|---|---|---|
| `eleven_v3` | ✅ | ❌ | GA (Feb 2026). Stability behaves as discrete modes. |
| `eleven_multilingual_v2` | ❌ | ❌ | API default. |
| `eleven_flash_v2_5` | ❌ | ✅ | ~75ms — real-time/streaming. |
| `eleven_turbo_v2_5` | ❌ | ✅ | low-latency. |

**v3 stability = discrete modes** (passed as the numeric value):
Creative ≈ `0.0` (most expressive, best tag response), Natural ≈ `0.5`,
Robust ≈ `1.0` (stable but **suppresses tags**).

**Audio tags** (v3, open-ended — illustrative not exhaustive): emotions
(`[excited]`, `[sad]`, `[angry]`, `[curious]`, `[sarcastic]`…), delivery
(`[whispers]`, `[shouts]`, `[rushed]`, `[drawn out]`, `[dramatic tone]`),
non-verbal (`[laughs]`, `[sighs]`, `[clears throat]`, `[gulps]`), accents,
sound effects. The model interprets natural-language directions; non-v3 models
speak tags literally or strip them.

- Sources: api-reference/text-to-speech/convert, voices/settings, best-practices,
  blog/v3-audiotags (note its "alpha" label is stale), blog/eleven-v3-is-now-GA.

## Current Vokda integration point

`infra/functions/synthesis-router/lib/adapters/elevenlabs.mjs` already:
- reads `model_id` from `params.options?.model_id` (default `eleven_multilingual_v2`);
- sends `voice_settings: { stability, similarity_boost }` from `params.options`.

So wiring = extend `voice_settings` (style, use_speaker_boost, speed), allow
model selection, and (for v3) let audio tags pass through in the text.

## Plan

### A. Capability model — per-model, two facets
Extend `SteeringKind` with `'settings'`. Resolve from the voice's model
capability (default model unless the request overrides):

```ts
{ kind: 'settings',
  label: 'Expressivity',
  settings: [
    { key: 'stability', label: 'Stability', min: 0, max: 1, step: 0.05, default: 0.5 },
    { key: 'style', label: 'Style exaggeration', min: 0, max: 1, step: 0.05, default: 0 },
    { key: 'speed', label: 'Speed', min: 0.7, max: 1.2, step: 0.05, default: 1 },
  ],
  audioTags: false /* true only when the selected model is eleven_v3 */ }
```

- A per-model matrix `{ audioTags, streaming, stabilityMode }`. `audioTags` true
  **iff** `model_id === 'eleven_v3'`.
- Unit-test: v3 model → `audioTags: true`; multilingual_v2 → `false`; settings
  descriptor present for all ElevenLabs voices.

### B. Thread settings end-to-end
- `SynthesisRequest.settings?: Record<string, number>` and (existing) `instructions`
  is OpenAI-only; for ElevenLabs use `settings` + optional `model`.
- Service forwards them into `options` (`stability`, `style`, `speed`,
  `use_speaker_boost`, `model_id`).
- **Router `elevenlabs.mjs`**: expand `voice_settings` to all five fields from
  `params.options` (clamped to documented ranges); honor `options.model_id`.
  Audio tags need **no adapter change** — they're already in `params.text`; the
  v3 model interprets them. Just ensure v3 is selectable.

### C. Audition UI — sliders + (v3) audio-tag affordance
When `steering.kind === 'settings'`: render the sliders from the descriptor.
When the selected model supports audio tags (v3), show a hint/affordance that
`[tags]` in the text are interpreted (and optionally a small insert palette of
common tags — `[whispers]`, `[excited]`, `[laughs]`). Gate strictly on v3 so we
never imply tag support where the model strips them.

### D. Model selection
Expose a model picker for ElevenLabs (`eleven_v3` for expressivity,
`eleven_flash_v2_5` for speed, `eleven_multilingual_v2` default). The capability
descriptor + audio-tag affordance update reactively with the chosen model.

## Data model

- `provider-steering.ts`: `SteeringKind += 'settings'`; descriptor carries
  `settings[]` + `audioTags` (model-derived).
- `SynthesisRequest.settings?: Record<string, number>`, `model?: string`.
- Per-model capability matrix as a typed constant.

## Acceptance criteria

- Descriptor returns `settings` for ElevenLabs voices; `audioTags` true only for
  `eleven_v3`. Unit-tested.
- Sliders change delivery audibly; clamped to documented ranges.
- With v3 selected, `[excited]`/`[whispers]` tags in the text produce the
  directed delivery (verified live with a valid key); with v2 they don't leak as
  spoken words inappropriately (best-effort — document the model dependence).
- `check:web` clean; `node --test` for the clamp/range + capability helpers.

## Out of scope

Streaming synthesis (separate roadmap item); a curated/closed audio-tag enum
(the set is open-ended — offer a palette, allow free text); voice-clone-fidelity
tuning.

## Risks / caveats

- **Model dependence is the trap**: audio tags only work on v3, and v3 has **no
  streaming** and higher latency. The UI must not offer tags on non-v3 models,
  and should note v3's latency.
- **Robust stability suppresses tags** — if exposing v3 stability as
  Creative/Natural/Robust, warn that Robust mutes expressivity.
- ElevenLabs free-tier key was flagged for unusual activity (known gap) — live
  verification needs a working key (the account's key currently works).
- `style > 0` and `use_speaker_boost` add latency — default style to 0.

## Effort (T-shirt)

- A capability matrix + per-model resolution + tests: **M**
- B adapter voice_settings expansion + service/type threading: **S–M**
- C/D sliders + model picker + v3 tag affordance: **M**

Total ≈ 1–2 focused days. Shares the per-voice/per-model capability refactor with
`feat-steerability-aws-polly.md` — do that refactor once, for both.
