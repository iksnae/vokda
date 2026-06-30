# Provider ID stability & deprecation policy

Vokda's voice catalog spans **25 TTS providers** — 9 cloud services and 16 open
models. Every provider is identified by a **provider-id**: a short,
machine-readable slug (e.g. `aws-polly`, `elevenlabs`, `kokoro`) that appears in
API payloads, voice metadata, credential endpoints, and client-side logic.

This document defines the stability contract for those identifiers. If you
integrate against Vokda's API, the provider catalog, or the synthesis
endpoints, this is your guarantee that the IDs you code against won't change
underneath you without warning.

---

## Canonical provider IDs

| id | name | type |
|----|------|------|
| `aws-polly` | AWS Polly | cloud_provider |
| `azure-speech` | Azure Speech | cloud_provider |
| `gcp-tts` | Google Cloud TTS | cloud_provider |
| `elevenlabs` | ElevenLabs | cloud_provider |
| `openai` | OpenAI | cloud_provider |
| `gemini-tts` | Gemini TTS | cloud_provider |
| `edge-tts` | Edge TTS | cloud_provider |
| `deepgram` | Deepgram | cloud_provider |
| `cartesia` | Cartesia | cloud_provider |
| `lmnt` | LMNT | cloud_provider |
| `kokoro` | Kokoro | open_model |
| `qwen3-tts` | Qwen3 TTS | open_model |
| `soprano` | Soprano | open_model |
| `chatterbox` | Chatterbox | open_model |
| `dia` | Dia | open_model |
| `outetts` | OuteTTS | open_model |
| `pocket-tts` | Pocket TTS | open_model |
| `spark-tts` | Spark TTS | open_model |
| `voxcpm` | VoxCPM | open_model |
| `kittentts` | KittenTTS | open_model |
| `marvis` | Marvis | open_model |
| `vibevoice` | VibeVoice | open_model |
| `bark` | Bark | open_model |
| `orpheus` | Orpheus TTS | open_model |
| `chatterbox-turbo` | Chatterbox Turbo | open_model |

---

## Stability contract

**Provider IDs are stable.** Once a provider-id appears in a tagged release, it
will not be renamed in any subsequent release. IDs are treated as a public
integration surface — equivalent to an API endpoint path or a field name.

**Adding providers is not breaking.** New providers may be added at any time in
a minor or patch release. Their IDs simply extend the catalog; they do not
affect existing integrations.

**Removing a provider is a breaking change.** If a provider must be retired,
its ID will be deprecated first and removed only in the next **major**
version. Deprecated providers remain queryable through the catalog endpoints
and continue to appear in voice metadata for historical consistency.

**The ID format is fixed.** Every provider-id matches `/^[a-z][a-z0-9-]*$/` —
lowercase ASCII, may include hyphens. The format itself will not change.

---

## Deprecation policy

When a provider approaches end-of-life (e.g. upstream service shutdown, license
change, or replacement by a newer model), the following process applies:

1. The provider's row in this document is marked **🗑️ Deprecated** with a
   deprecation date and a migration note.
2. The change is announced in the release changelog.
3. The deprecated ID remains functional for **at least one full minor release
   cycle** (≥ 4 weeks).
4. At the next **major** release, the ID and all associated voices are removed
   from the catalog.

This policy ensures integrators always have a deprecation window and never
discover removals through broken code.

---

## Changelog expectation

Any change to the set of canonical provider IDs — addition, deprecation, or
removal — MUST appear in the repository's `CHANGELOG.md` under a dedicated
**"Provider catalog"** heading. The entry should list the affected IDs and a
one-line reason for each change.

---

## Non-governed IDs

The following are NOT governed by this stability contract:

- **Provider-internal voice IDs** (e.g. `en-US-JennyNeural`). These are owned
  by upstream providers and may change at their discretion.
- **Feature flags and auth-type labels** attached to a provider. These are
  operational metadata and may evolve independently.

The catalog's source of truth for provider IDs is the JSON artifact at
`/api/v1/providers.json`. In case of discrepancy, that artifact takes
precedence over this document (see [API.md](./API.md)).
