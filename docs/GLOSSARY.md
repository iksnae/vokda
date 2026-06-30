# Glossary

Core API terms for integrators working with the Vokda platform. Each term is grounded in the live data model and API.

## Provider

A TTS (text-to-speech) service that Vokda connects to for voice synthesis — cloud platforms like OpenAI, ElevenLabs, AWS Polly, Azure Speech, and Google Cloud TTS, as well as local models like Kokoro and Bark. Each provider is listed in the catalog with metadata including its type, website, and authentication format. Managed via `POST /v1/credentials` (BYOK).

## Provider ID

A URL-safe slug that uniquely identifies a provider in the API, e.g. `openai`, `aws-polly`, `azure-speech`. Used in synthesis requests (`POST /v1/synthesize` requires `provider`), credential management, and voice filtering (`?provider=openai`). For the full list see `docs/PROVIDER_IDS.md`.

## Voice

A synthesizable TTS voice entity in the Vokda catalog. Each voice carries a name, provider, BCP-47 language codes, gender, quality tier, tags, audio samples, one or more synthesis variants, and an optional expressivity descriptor (see [Steering](#steering)). Voices are the primary discovery unit — browsed in the catalog, auditioned on detail pages, and referenced by `voiceId` in synthesis jobs.

## Dialect

The language-region combination a voice speaks, expressed as a BCP-47 code (e.g. `en-US` for American English, `fr-FR` for French, `ja-JP` for Japanese). Voices may support one or more dialects, and the catalog can be filtered by language prefix (`?language=en` matches all English dialects).

## Catalog

The full, static dataset of TTS voices (`voices.json`) that Vokda indexes and serves. The catalog is the source of truth for voice metadata, samples, and variants; it powers both the web discovery UI and the `/v1/voices` API endpoint.

## Capability

A feature flag or property describing what a voice or provider can do. Examples include SSML support (`ssmlSupport`), streaming, word-level timestamps, voice cloning, and expressivity controls. Capabilities are surfaced on voice detail pages, in the model card, and in API responses.

## Job

A record of a synthesis request, stored as the user's audio clip. Each job captures the input text (or SSML), the voice used, its status (`pending` / `completed` / `failed`), the output audio, waveform data, and latency. Retrieved via `GET /v1/jobs`; downloadable, re-synthesizable, and deletable.

## SSML tag

A Speech Synthesis Markup Language element (e.g. `<break>`, `<prosody>`, `<emphasis>`, `<say-as>`) that controls *how* text is spoken — adjusting pause length, rate, pitch, volume, or pronunciation. Supported by AWS Polly, Azure Speech, Google Cloud TTS, and Edge TTS. The audition panel includes a visual SSML editor with tag toolbar, validation, and quick-reference examples; see `docs/DISCOVERY.md#ssml-editor`.

## Steering

Per-voice expressivity ("steering") control that tells API consumers what delivery adjustment a voice supports and which `options.*` keys to send when synthesizing. Steering is one of four kinds: `instructions` (free-text direction, OpenAI), `styles` (predefined styles like "newscaster", AWS Polly), `settings` (numeric sliders for stability and similarity, ElevenLabs), or `none`. Every voice advertises its steering capability in `/v1/voices` responses; see the [Steering](../SYNTHESIS_API.md#voice-capabilities) reference for the request shapes.
