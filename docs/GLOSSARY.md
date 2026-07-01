# Glossary

Core API terms for integrators working with the Vokda voice platform.

## Provider

A TTS service or model source that produces synthetic speech. Vokda's catalog spans cloud providers (e.g., OpenAI, ElevenLabs, Azure Speech) and open models (e.g., Kokoro, Bark, Orpheus). Each provider has a unique `providerId` slug used across the API, credential storage, and voice metadata.

## Provider ID

A stable, machine-readable slug that identifies a provider (e.g., `openai`, `aws-polly`, `elevenlabs`). Provider IDs appear in API payloads, credential endpoints, and the `/v1/providers` listing. They are governed by a stability contract — once released, an ID is never renamed without a formal deprecation window. See [docs/PROVIDER_IDS.md](./PROVIDER_IDS.md).

## Voice

The primary catalog entity — a named TTS voice with a unique ULID, display name, provider association, BCP-47 language tags, gender, quality tier, tags, audio samples, synthesis variants, and a model card. Voices are queryable via `/v1/voices` and the public catalog endpoint `/api/v1/voices.json`.

## Dialect

A regional or social variety of a language, surfaced through the voice's BCP-47 language tag (e.g., `en-IE` for Irish English, `fr-CA` for Canadian French) and its `accent` descriptor. Dialect is a filterable voice attribute — it is not modeled as a standalone entity.

## Catalog

The full voice dataset — 550+ voices across 25 providers — available at `/api/v1/voices.json` (public) and via the `/v1/voices` API endpoint (authenticated). The catalog is the source of truth for voice metadata, audio samples, provider information, and steering capabilities.

## Capability

A feature flag or attribute that describes what a voice or provider supports: SSML, streaming, word-level timestamps, voice cloning, or emotion control. Capabilities appear in the voice's `modelCard.capabilities` object and on the `VoiceVariant` (e.g., `supportsSsml`).

## Job

A synthesis request record, stored as a clip in the user's library. Each job captures the input text (or SSML), voice, provider, output audio, synthesis latency, waveform data, and user-editable metadata (clip name, description, tags). Managed through the `/v1/jobs` endpoints.

## SSML tag

A Speech Synthesis Markup Language element — such as `<break>`, `<prosody>`, `<emphasis>`, or `<phoneme>` — that controls pronunciation, pacing, pitch, and other delivery characteristics in a synthesis request. SSML-capable voices accept `mode: "ssml"` and are marked with `supportsSsml: true`. See [docs/DISCOVERY.md#ssml-editor](./DISCOVERY.md#ssml-editor).

## Steering

Per-voice expressivity control that tells API consumers what delivery options a voice supports and which `options.*` keys to send when calling `POST /v1/synthesize`. Four kinds exist: `instructions` (free-text direction for OpenAI's gpt-4o-mini-tts), `styles` (preset choices like `newscaster` for certain AWS Polly voices), `settings` (numeric sliders for ElevenLabs stability/similarity/style), and `none`.
