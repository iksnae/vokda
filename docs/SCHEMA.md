# Vokda Data Schema

> This documents all data models across the catalog, Amplify Data (AppSync/DynamoDB), and the Synthesis API.

---

## Catalog Models (voices.json)

### Voice

The primary catalog entity. Source of truth: `apps/web/static/data/voices.json`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | ULID | ✓ | Unique voice identifier |
| `name` | string | ✓ | Display name (e.g., "Joanna") |
| `provider` | string | ✓ | Provider display name (e.g., "AWS Polly") |
| `providerId` | string | ✓ | Provider slug (e.g., "aws-polly") |
| `providerVoiceId` | string | | Provider's own voice ID |
| `description` | string | ✓ | Full description |
| `shortLabel` | string | | Short descriptor (e.g., "Warm American female") |
| `tags` | string[] | ✓ | Catalog tags (use-case, tone, audience) |
| `languages` | string[] | ✓ | BCP-47 codes (e.g., ["en-US"]) |
| `qualityTier` | enum | ✓ | `basic` \| `standard` \| `premium` |
| `gender` | string | | `female` \| `male` \| `neutral` \| `variable` |
| `speakingStyle` | string | | `balanced` \| `chat` \| `newscast` \| `cheerful` \| ... |
| `accent` | string | | Accent descriptor (e.g., "British", "Southern US") |
| `ageGroup` | string | | `child` \| `young` \| `young_adult` \| `adult` \| `middle_aged` \| `mature` \| `senior` |
| `licenseNotes` | string | | Licensing information |
| `imageUrl` | string | | Voice avatar image |
| `variants` | VoiceVariant[] | ✓ | Available synthesis variants |
| `samples` | VoiceSample[] | ✓ | Pre-generated audio samples |
| `modelCard` | ModelCard | | Technical metadata |
| `metadata` | object | | Additional structured metadata |
| `metadataQuality` | enum | | `sparse` \| `curated` \| `editorial` |

### VoiceVariant

A specific synthesizable configuration of a voice.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | ULID | ✓ | Unique variant identifier |
| `sourceType` | enum | ✓ | `cloud_provider` \| `hf_model` \| `hf_space` \| `hf_endpoint` \| `self_hosted` \| `local_model` |
| `sourceKey` | string | ✓ | Provider-specific voice key (e.g., `aws:polly:Joanna`, `c7c790c5-...`) |
| `runnable` | boolean | ✓ | Whether live synthesis is possible |
| `supportsSsml` | boolean | ✓ | Whether SSML input is supported |
| `outputFormats` | string[] | | Supported formats: `mp3`, `wav`, `pcm`, `ogg` |
| `maxInputChars` | number | | Character limit per request |
| `previewOnly` | boolean | | If true, only pre-generated samples available |

**sourceKey formats by provider:**

| Provider | Format | Example |
|----------|--------|---------|
| AWS Polly | `aws:polly:{VoiceId}` | `aws:polly:Joanna` |
| Azure Speech | `azure:{voiceName}` | `azure:en-US-JennyNeural` |
| Google Cloud TTS | `gcp:{voiceName}` | `gcp:en-US-Wavenet-D` |
| OpenAI | `openai:{model}:{voice}` | `openai:tts-1-hd:nova` |
| ElevenLabs | `elevenlabs:{voiceId}` | `elevenlabs:21m00Tcm4TlvDq8ikWAM` |
| Gemini TTS | `gemini:{voiceName}` | `gemini:Kore` |
| Cartesia | UUID | `c7c790c5-2bf4-47e4-bc83-5f43e61f3803` |
| Deepgram | name | `aura-2-athena-en` |
| LMNT | name | `dalton` |
| Edge TTS | name | `en-AU-WilliamMultilingualNeural` |
| Kokoro / local | `mlx:{voiceName}` | `mlx:af_heart` |
| Bark | `bark:{voiceName}` | `bark:v2/en_speaker_0` |

### VoiceSample

A pre-generated audio clip for catalog playback.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scriptKey` | string | ✓ | Script identifier (e.g., "intro", "narration") |
| `audioUrl` | string | ✓ | Path to audio file (e.g., `/audio/samples/{id}.mp3`) |
| `durationSec` | number | | Duration in seconds |
| `format` | string | | Audio format (default: "mp3") |

### ModelCard

Technical metadata for a voice's underlying model.

| Field | Type | Description |
|-------|------|-------------|
| `modelName` | string | Model identifier (e.g., "tts-1-hd", "Wavenet") |
| `modelVersion` | string | Version string |
| `modelFamily` | string | Model family (e.g., "Neural", "Generative") |
| `architecture` | string | Model architecture |
| `capabilities` | object | Feature flags (streaming, cloning, SSML, etc.) |
| `performance` | object | Sample rate, bit depth, channels |
| `docsUrl` | string | Link to provider documentation |

---

## Amplify Data Models (AppSync / DynamoDB)

All models include Amplify auto-fields: `id` (UUID), `owner`, `createdAt`, `updatedAt`.

### Favorite

| Field | Type | Auth | Description |
|-------|------|------|-------------|
| `voiceId` | string! | Owner only | Catalog voice ID |
| `provider` | string | | Provider ID (denormalized) |
| `createdAtIso` | string! | | ISO 8601 timestamp |

### Collection

| Field | Type | Auth | Description |
|-------|------|------|-------------|
| `name` | string! | Owner + curator/admin | Collection name |
| `description` | string | | Optional description |
| `visibility` | enum | | `private` \| `team` |
| `createdAtIso` | string! | | ISO 8601 timestamp |
| `updatedAtIso` | string! | | ISO 8601 timestamp |

### CollectionVoice

| Field | Type | Auth | Description |
|-------|------|------|-------------|
| `collectionId` | ID! | Owner + curator/admin | Parent collection |
| `voiceId` | string! | | Catalog voice ID |
| `note` | string | | User note for this voice |
| `position` | integer | | Sort order (default: 0) |
| `addedAtIso` | string! | | ISO 8601 timestamp |

### CurationShelf

| Field | Type | Auth | Description |
|-------|------|------|-------------|
| `key` | string! | Curator/admin + public read | Shelf identifier |
| `title` | string! | | Display title |
| `description` | string | | Shelf description |
| `voiceIds` | string[]! | | Ordered voice IDs |
| `published` | boolean | | Whether publicly visible |
| `updatedAtIso` | string! | | ISO 8601 timestamp |

### CurationWorkspace

| Field | Type | Auth | Description |
|-------|------|------|-------------|
| `key` | string! | Curator/admin + public read | Workspace identifier |
| `metadataOverrides` | JSON! | | Voice metadata patches |
| `customVoices` | JSON! | | Draft voices not yet in catalog |
| `providerCatalog` | JSON! | | Discovered provider voice data |
| `published` | boolean | | Whether changes are live |
| `updatedAtIso` | string! | | ISO 8601 timestamp |

### VoiceRecord

Future DB-backed catalog entry (currently catalog is static JSON).

| Field | Type | Auth | Description |
|-------|------|------|-------------|
| `name` | string! | Curator/admin write, public read | Voice name |
| `provider` | string! | | Provider display name |
| `providerId` | string! | | Provider slug |
| `providerVoiceId` | string | | Provider's own voice ID |
| `description` | string! | | Full description |
| `tags` | string[]! | | Catalog tags |
| `languages` | string[]! | | BCP-47 language codes |
| `qualityTier` | enum | | `basic` \| `standard` \| `premium` |
| `licenseNotes` | string | | Licensing info |
| `metadata` | JSON! | | Structured metadata |
| `modelCard` | JSON | | Technical model card |
| `imageUrl` | string | | Avatar image URL |
| `audioUrl` | string | | Primary audio sample URL |
| `samples` | JSON | | Audio sample array |
| `variants` | JSON | | Variant array |
| `status` | enum | | `draft` \| `published` \| `archived` |
| `createdAtIso` | string! | | ISO 8601 timestamp |
| `updatedAtIso` | string! | | ISO 8601 timestamp |

### ProviderRecord

| Field | Type | Auth | Description |
|-------|------|------|-------------|
| `name` | string! | Curator/admin write, public read | Provider name |
| `slug` | string! | | URL-safe identifier |
| `type` | enum | | `cloud_provider` \| `open_model` \| `self_hosted` \| `other` |
| `websiteUrl` | string | | Provider website |
| `description` | string | | Provider description |
| `colorHex` | string | | Brand color |
| `voiceCount` | integer | | Number of voices in catalog |
| `status` | enum | | `active` \| `inactive` |
| `createdAtIso` | string! | | ISO 8601 timestamp |
| `updatedAtIso` | string! | | ISO 8601 timestamp |

### UserProviderCredential

| Field | Type | Auth | Description |
|-------|------|------|-------------|
| `providerId` | string! | Owner only | Provider slug (e.g., "openai") |
| `label` | string! | | User label (e.g., "My OpenAI key") |
| `credentialData` | string! | | JSON: `{ apiKey }` or `{ subscriptionKey, region }` or `{ accessKeyId, secretAccessKey, region }` |
| `status` | enum | | `active` \| `invalid` \| `expired` |
| `lastTestedAtIso` | string | | Last connection test timestamp |
| `createdAtIso` | string! | | ISO 8601 timestamp |
| `updatedAtIso` | string! | | ISO 8601 timestamp |

### SynthesisJob

| Field | Type | Auth | Description |
|-------|------|------|-------------|
| `voiceId` | string! | Owner only | Catalog voice ID |
| `providerId` | string! | | Provider slug |
| `inputText` | string! | | Text or SSML input |
| `inputMode` | enum | | `text` \| `ssml` |
| `status` | enum | | `pending` \| `completed` \| `failed` |
| `audioPath` | string | | S3 key for audio file |
| `durationMs` | integer | | Audio duration |
| `latencyMs` | integer | | Synthesis latency |
| `errorMessage` | string | | Error details (if failed) |
| `createdAtIso` | string! | | ISO 8601 timestamp |

### AdminAuditEvent

| Field | Type | Auth | Description |
|-------|------|------|-------------|
| `action` | string! | Admin only | Action name (e.g., "role_change") |
| `targetType` | string! | | Entity type (e.g., "user") |
| `targetId` | string! | | Entity ID |
| `payload` | JSON | | Action details |
| `createdAtIso` | string! | | ISO 8601 timestamp |

---

## Synthesis API Models (SAM / DynamoDB)

These models are managed by the SAM stack, not Amplify.

### VokdaApiKey (table: `VokdaApiKey-dev`)

| Field | Type | Description |
|-------|------|-------------|
| `keyId` | string (PK) | Unique key identifier |
| `owner` | string | Cognito user sub |
| `keyHash` | string | SHA-256 hash of the full key |
| `prefix` | string | First 12 chars (for display) |
| `label` | string | User-provided label |
| `status` | string | `active` \| `revoked` |
| `createdAt` | string | ISO 8601 |
| `lastUsedAt` | string | ISO 8601 (updated on use) |

### UserMediaUsage (table: `UserMediaUsage-dev`)

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string (PK) | Cognito user sub |
| `totalBytes` | number | Total storage used |
| `fileCount` | number | Number of audio files |
| `quotaBytes` | number | Storage limit (default: 5 GB) |

### SynthesisJob (extended fields in API)

The API adds these fields beyond the Amplify model:

| Field | Type | Description |
|-------|------|-------------|
| `voiceName` | string | Display name (denormalized) |
| `audioUrl` | string | Presigned S3 URL (7-day expiry) |
| `fileSizeBytes` | number | Audio file size |
| `clipName` | string \| null | User-set clip name |
| `clipDescription` | string \| null | User-set description |
| `clipTags` | string[] | User-set tags (max 20) |

---

## Export Formats

### Voice Pack (JSON)

Exported from collections. Portable format for voice pipeline integration.

```json
{
  "version": "1.0",
  "name": "Sci-Fi Audiobook Voices",
  "createdAt": "2026-03-06T12:00:00.000Z",
  "voices": [
    {
      "voiceId": "01KJ...",
      "name": "Joanna",
      "provider": "aws-polly",
      "providerId": "aws-polly",
      "providerVoiceId": "Joanna",
      "variant": {
        "sourceKey": "aws:polly:Joanna",
        "sourceType": "cloud_provider"
      },
      "languages": ["en-US"],
      "qualityTier": "premium",
      "tags": ["narration", "audiobook"]
    }
  ]
}
```
