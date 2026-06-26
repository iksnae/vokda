# Feature: Clip waveform visualization

> Plan only — no code yet. Authored 2026-06-26. Closes the "Clip waveform
> visualization" roadmap item (Phase 2b).

## Motivation

Clients (the Vokda web UI **and** native API consumers like khaos.machine.x)
want to render a waveform for synthesized clips. Streaming is explicitly **not**
a requirement, so the clean model is: **compute a downsampled peaks array once,
server-side, at synthesis time, and serve it as data.** Every client then
renders a waveform with zero audio decoding — exactly the pattern we use for
`durationMs` and the `steering` capability: the platform hands clients
render-ready data instead of making each one re-derive it.

## Design decision: server-side precomputed peaks

| Option | Verdict |
|--------|---------|
| **Server precomputes peaks → API returns data** | ✅ **Chosen.** One compute; any client renders trivially; matches the API-platform model. |
| Client-side decode (wavesurfer.js in the browser) | Web-only; leaves every native/API client to implement MP3 decoding. Rejected as the primary path (fine as a web fallback). |
| Streaming/progressive waveform | Out of scope — not wanted. |

## Current integration points

- **Compute site**: `result.audio` (the rendered MP3 Buffer) is in hand in both
  `infra/functions/synthesis-worker/index.mjs` (async) and
  `infra/functions/synthesis-router/index.mjs` `handleSynthesize` (sync) — the
  same spot that computes `durationMs` via `lib/audio-duration.mjs`.
- **Important**: `audio-duration.mjs` reads MP3 *frame headers* only — it does
  not decode samples. Amplitude/peaks **require decoding MP3 → PCM**.
- **Storage**: `SynthesisJob` (amplify/data/resource.ts) already carries
  `durationMs`; `lib/jobs.mjs createJob` persists job fields and the clip API
  response is built there.
- **Render sites (web)**: `apps/web/src/routes/account/clips/+page.svelte` and
  the audition player in `apps/web/src/routes/voices/[id]/+page.svelte`.

## Wire format (lock this first)

Emit the **BBC `audiowaveform` JSON shape** so clients can feed it straight into
**peaks.js / wavesurfer.js** (and it's trivial to draw by hand):

```json
"waveform": {
  "version": 2,
  "channels": 1,
  "sample_rate": 24000,
  "samples_per_pixel": 512,
  "bits": 8,
  "length": 500,
  "data": [ -38, 42, -50, 61, /* …interleaved min,max per bucket… */ ]
}
```

- **Mono**, fixed `length` (bucket count) ~400–1000 → resolution-independent
  (clients scale to their width). At 8-bit min/max that's ~1 KB.
- Values are signed ints in `[-(2^(bits-1)), 2^(bits-1)-1]` per the convention;
  clients normalize by `bits`.
- Document the shape in `SYNTHESIS_API.md` so native clients render without
  guessing.

## Plan

### A. Peaks helper (pure, tested) — `lib/waveform.mjs`
`computeWaveform(pcmFloat32, { buckets = 500, bits = 8 })` → the audiowaveform
object. Pure: takes decoded mono PCM samples, buckets them, takes min/max per
bucket, quantizes to `bits`. Unit-tested (`node --test`) against synthetic PCM
(silence → zeros; a ramp/sine → expected envelope; bucket count honored). No IO.

### B. MP3 decode in the Lambda
Add a WASM MP3 decoder (e.g. `mpg123-decoder` / `@wasm-audio-decoders/*`) to the
synthesis-router (and copy into the worker like `audio-duration.mjs`). Wrap as
`decodeToMonoPcm(buffer, contentType)` → `Float32Array` (downmix to mono). WAV
input (if ever used) decodes from the header without the WASM path.

### C. Compute at synthesis time
In the worker + sync router, after `result.audio` (next to `durationMs`):
`waveform = computeWaveform(decodeToMonoPcm(result.audio, result.contentType))`,
wrapped in try/catch → `null` on failure (never fail a synth over a waveform).

### D. Store + expose
- **Storage (recommended A)**: add `waveformJson: a.string()` to `SynthesisJob`;
  `createJob`/`updateJob` persist `JSON.stringify(waveform)` (~1 KB, well under
  DynamoDB limits). *(Alt B: sidecar S3 `…/{jobId}.peaks.json` + presigned
  `waveformUrl` — choose if payloads grow or CDN caching is wanted.)*
- **API**: `POST /v1/synthesize`, `GET /v1/jobs`, `GET /v1/jobs/{id}` include
  `waveform` (parsed object) — null when unavailable.

### E. Web renderer
A small `<WaveformCanvas peaks={…} />` component drawing min/max bars on a
`<canvas>` (brand colors, progress overlay synced to the audio element's
`currentTime`). Use it in the clips list + audition player. ~80 lines, no deps.

### F. Backfill (optional follow-up)
Existing clips have no `waveformJson`. Either leave them blank (web falls back to
a flat bar) or add a lazy endpoint that decodes the stored MP3 on first request
and caches the result. Note as a follow-up; don't block the feature on it.

## Data model

- `SynthesisJob.waveformJson?: string` (JSON of the audiowaveform object).
- API response: `waveform?: object | null`.
- SDK: `SynthesizeResponse.waveform?` + a `Waveform` type (`@vokda/sdk`).

## Acceptance criteria

- `computeWaveform` unit-tested (silence/ramp/bucket-count/quantization).
- A new synth returns a populated `waveform` in the synth response and
  `GET /v1/jobs/{id}`; a decode failure yields `waveform: null`, not an error.
- The format matches the documented audiowaveform shape (peaks.js can load it).
- Web clips + audition render a real waveform with a play-progress overlay.
- `check:web` clean; `node --test` for the helper; SAM deploy. Documented in
  `SYNTHESIS_API.md`.

## Out of scope

Streaming/progressive waveforms; per-channel (stereo) data (mono is enough for
TTS); editing/markers (peaks.js territory); regenerating waveforms for the
catalog *sample* clips (separate from synthesized clips — could reuse the helper
at publish time later).

## Risks / caveats

- **MP3 decode cost**: adds a WASM dependency (~100–300 KB to the Lambda) + a
  little CPU per synth. TTS clips are short → fast. Verify cold-start impact.
- **Determinism**: decode + bucketing is deterministic for a given MP3, so the
  helper is straightforwardly testable.
- **Existing clips**: no waveform until backfilled (F).
- **Bundle/layer**: the worker needs the decoder too — extend `build.sh` to copy
  `waveform.mjs` (+ the decoder) like it does `audio-duration.mjs`.

## Effort & sequencing (T-shirt)

1. **A** peaks helper + tests (pure) — **S**.
2. **B** MP3 decoder integration — **M** (the main unknown: decoder choice +
   bundle/cold-start).
3. **C/D** compute + store + API (worker + router + schema + jobs.mjs) — **M**.
4. **E** web canvas renderer — **S–M**.
5. Docs + SDK type — **S**. (**F** backfill = optional follow-up.)

Total ≈ 1–2 focused days. Lock the **wire format (Voice format section)** before
wiring any client.
