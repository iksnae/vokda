# Feature: Voice steerability — AWS Polly

> Plan only — no code yet. Authored 2026-06-26. Extends the steerability model
> (`provider-steering.ts`) established for OpenAI to AWS Polly. Grounded in live
> AWS docs research (June 2026).

## Honest headline

**Polly's steerable surface is thin.** Unlike OpenAI's free-text `instructions`,
Polly exposes exactly one delivery style — **newscaster** — via SSML, and only
on **4 voices**. Conversational is now implicit (pick the neural voice; no tag).
Generative and long-form expressivity is **intrinsic to the model and not
parameterizable**. So this feature is small and **per-voice**, not a rich
control. Worth doing for completeness + the 4 marquee voices, but scope
expectations accordingly.

## Researched API surface (AWS docs, June 2026)

- **Engines** (`Engine` param): `standard | neural | long-form | generative`.
  Omitting it defaults to `standard` → fails for any non-standard voice
  (`EngineNotSupportedException`). **Always send `Engine` explicitly.**
- **Newscaster style**: SSML `<amazon:domain name="news">…</amazon:domain>`,
  `TextType=ssml`, **`Engine=neural`**, on exactly these voices:
  - `Matthew` (en-US), `Joanna` (en-US), `Lupe` (es-US), `Amy` (en-GB).
- **Conversational**: as of 2021 it's the **default** for Matthew/Joanna neural —
  no SSML tag; just select the neural voice. Do **not** emit a conversational tag.
- **Generative / long-form**: no style/emotion/instruction parameter at all —
  expressivity is automatic. Newscaster is **not** supported on generative.
- **Limits**: `SynthesizeSpeech` max 6000 chars (3000 billed); SSML not billed.
- Sources: voice-engines-polly, neural-voices, newscaster-voices/newscaster-tag,
  generative-voices, long-form-voices, supportedtags, API_SynthesizeSpeech.

**Conclusion:** the only real steering knob is newscaster on 4 voices. Capability
must be keyed **per (voice, engine)**, never per-provider.

## Current Vokda integration point

`infra/functions/synthesis-router/lib/adapters/aws-polly.mjs` already:
- selects `Engine` from `params.options?.engine || credential.engine || 'neural'`;
- supports `TextType=ssml` when `params.mode === 'ssml'`;
- falls back neural→standard on `InvalidParameterValueException`.

So wiring newscaster = wrap the text in the SSML style tag, force
`Engine=neural` + `TextType=ssml` for that path, and gate on the 4 voices.

## Plan

### A. Capability model — add `styles` kind, make it per-voice
Extend `SteeringKind` (`provider-steering.ts`) to include `'styles'`. Because
Polly support is voice-specific, `getProviderSteering` must accept the **voice**
(or providerVoiceId), not just the providerId:

```ts
// styles descriptor
{ kind: 'styles', label: 'Style', options: [{ id: 'default', label: 'Default' },
                                            { id: 'newscaster', label: 'Newscaster' }] }
```

- Return the `newscaster` option **only** when the Polly voice's
  `providerVoiceId` ∈ {Matthew, Joanna, Lupe, Amy}; otherwise `{ kind: 'none' }`.
- Encode the support set as data (a small constant set), not magic strings in
  the UI. Unit-test the gating (Matthew → styles incl. newscaster; a random
  Polly voice → none; non-Polly → none).

> Note the signature change ripples: OpenAI's descriptor becomes voice-agnostic
> but still resolvable from the voice. Keep one `getProviderSteering(voice)` that
> dispatches on `voice.providerId` (+ providerVoiceId for Polly).

### B. Thread a `style` option end-to-end
- `SynthesisRequest.style?: string` (alongside `instructions`).
- Service includes it in `options.style` when set.
- **Router `aws-polly.mjs`**: when `params.options?.style === 'newscaster'` and
  the voice supports it, force `Engine='neural'`, `TextType='ssml'`, and wrap:
  `<speak><amazon:domain name="news">{escaped text}</amazon:domain></speak>`.
  Validate the voice is in the newscaster set first; otherwise ignore the style
  (don't error). Keep the neural→standard fallback for the non-style path only.
- Escape user text for SSML when wrapping (`&`, `<`, `>`); if the user is already
  in SSML mode, wrap their existing markup inside the domain tag instead.

### C. Audition UI — a **Style** dropdown (gated)
In the voice-detail audition studio, when `steering.kind === 'styles'`, render a
small dropdown (Default / Newscaster). Reuse the gating pattern from the OpenAI
`Direction` input. Hidden for every voice that doesn't support a style.

### D. (Optional, adjacent) Engine/quality selector
Not steering per se, but high-value for Polly: a control to pick
neural/long-form/generative where the voice supports it. Recommend a **separate
follow-up** — it's a per-voice "quality" axis, not "direction", and muddying the
steering control with it hurts clarity. Note it; don't build it here.

## Data model

- `provider-steering.ts`: `SteeringKind += 'styles'`; descriptor carries
  `options: {id,label}[]`; resolution takes the voice.
- `SynthesisRequest.style?: string`.
- Polly newscaster voice set as a typed constant.

## Acceptance criteria

- `getProviderSteering` returns a `newscaster` style **only** for Matthew/Joanna/
  Lupe/Amy Polly voices; `none` otherwise. Unit-tested.
- Selecting Newscaster produces a real audible newscaster read on a supported
  voice (verified live against Polly with a valid key); selecting Default does
  not wrap SSML.
- Unsupported voice + a stray `style` option is ignored, not errored.
- `check:web` clean; router syntax + a `node --test` for the SSML-wrap helper.

## Out of scope

Generative/long-form expressivity (not parameterizable), engine/quality selector
(separate follow-up), DRC and other SSML effects.

## Risks / caveats

- **Tiny surface**: 4 voices. Set expectations — this is completeness, not a
  headline capability.
- **Per-voice gating is mandatory** — newscaster on the wrong voice/engine →
  `InvalidSsmlException`/`EngineNotSupportedException`. Validate before calling.
- The account's current Polly BYOK key is **invalid** (found earlier) — live
  verification needs a working key.
- SSML escaping: wrapping raw user text requires entity-escaping or Polly errors.

## Effort (T-shirt)

- A capability model + per-voice gating (signature change + tests): **M**
- B adapter SSML wrap + service/type threading: **S–M**
- C UI dropdown: **S**

Total ≈ a focused day. The bulk is the per-voice capability refactor (which also
benefits ElevenLabs — see `feat-steerability-elevenlabs.md`), not the SSML.
