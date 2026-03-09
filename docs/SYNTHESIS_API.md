# Vokda Synthesis API

> **Base URL:** `https://api.vokda.iksnae.com`

The Vokda Synthesis API provides server-side text-to-speech synthesis, clip management, and API key administration. All endpoints require authentication via either a Vokda API key or a Cognito JWT token.

---

## Authentication

Every request must include an `Authorization` header:

```
Authorization: Bearer <token>
```

Two token types are accepted:

| Type | Format | How to get |
|------|--------|-----------|
| **Vokda API Key** | `vk_live_...` | Create at `/account/api-keys` |
| **Cognito JWT** | `eyJ...` (ID or access token) | Sign in via the web app |

API keys are recommended for programmatic access. JWTs are used automatically by the web app.

---

## Endpoints

### GET /v1/providers

List TTS providers available to your account — i.e. providers where you have active credentials configured. Use `?all=true` to see the full catalog including providers you haven't set up yet.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `all` | string | | Set to `"true"` to list all providers (not just enabled) |

**Response (200):**

```json
{
  "providers": [
    {
      "id": "openai",
      "name": "OpenAI",
      "type": "cloud_provider",
      "websiteUrl": "https://platform.openai.com/docs/guides/text-to-speech",
      "synthesisAvailable": true,
      "authType": "api_key",
      "credentialFormat": { "apiKey": "string" },
      "ssmlSupport": false,
      "voiceIdFormat": "alloy, echo, fable, nova, onyx, shimmer",
      "notes": "Supports tts-1 and tts-1-hd models. Speed 0.25–4.0."
    }
  ],
  "count": 3,
  "enabledOnly": true
}
```

When `?all=true` is not set, the `enabledOnly: true` flag confirms filtering is active.

---

### GET /v1/voices

List voices from your enabled providers. Supports filtering by provider, language, gender, quality, and free-text search. Only voices from providers you have credentials for are returned.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | | Filter by provider ID (e.g. `openai`) |
| `language` | string | | Filter by language code prefix (e.g. `en`, `en-US`) |
| `gender` | string | | Filter by gender: `male`, `female`, `neutral` |
| `quality` | string | | Filter by quality tier: `premium`, `standard` |
| `search` | string | | Free-text search across name, description, tags |
| `limit` | number | 100 | Max results per page (1–500) |
| `offset` | number | 0 | Pagination offset |

**Response (200):**

```json
{
  "voices": [
    {
      "id": "01KJZXZNF942C62SAR07KM4HBJ",
      "name": "en-IE-ConnorNeural",
      "provider": "Azure Speech",
      "providerId": "azure-speech",
      "providerVoiceId": "en-IE-ConnorNeural",
      "description": "English (Ireland) Male neural voice.",
      "languages": ["en-IE"],
      "gender": "male",
      "age": "adult",
      "qualityTier": "premium",
      "tags": ["male", "ie"],
      "toneTags": ["steady"],
      "audioUrl": "/audio/samples/01KJZXZNF942C62SAR07KM4HBJ.mp3",
      "ssmlSupport": true
    }
  ],
  "total": 47,
  "limit": 100,
  "offset": 0
}
```

If no providers are configured, returns an empty list with a helpful message:

```json
{
  "voices": [],
  "total": 0,
  "limit": 100,
  "offset": 0,
  "message": "No providers configured. Add credentials at /account/providers or POST /v1/credentials."
}
```

---

### GET /v1/voices/{id}

Get full details for a single voice, including samples, variants, and model card. Only returns voices from your enabled providers.

**Response (200):**

```json
{
  "id": "01KJZXZNF942C62SAR07KM4HBJ",
  "name": "en-IE-ConnorNeural",
  "provider": "Azure Speech",
  "providerId": "azure-speech",
  "providerVoiceId": "en-IE-ConnorNeural",
  "description": "English (Ireland) Male neural voice.",
  "languages": ["en-IE"],
  "gender": "male",
  "age": "adult",
  "qualityTier": "premium",
  "tags": ["male", "ie"],
  "toneTags": ["steady"],
  "audioUrl": "/audio/samples/01KJZXZNF942C62SAR07KM4HBJ.mp3",
  "imageUrl": "/images/voices/01KJZXZNF942C62SAR07KM4HBJ.jpg",
  "licenseNotes": "Use governed by Azure AI Speech terms.",
  "metadata": { "genderPresentation": "male", "agePresentation": "adult", "toneTags": ["steady"] },
  "modelCard": { "ssmlSupport": true, "streamingSupport": true, "sampleRate": 48000 },
  "samples": [
    {
      "id": "01KJZXZNF9WP5R4ES2RM6074GB",
      "label": "Default",
      "audioUrl": "/audio/samples/01KJZXZNF942C62SAR07KM4HBJ.mp3",
      "transcript": "This guidance applies to all production workloads..."
    }
  ],
  "variants": [
    {
      "id": "01KJZXZNF92GWKBAY7NFNJDXTH",
      "sourceKey": "azure:speech:en-IE-ConnorNeural",
      "sourceType": "cloud_provider",
      "runnable": true,
      "supportsSsml": true,
      "outputFormats": ["mp3", "wav", "pcm"],
      "maxInputChars": 10000
    }
  ]
}
```

**Response (404):**

```json
{
  "error": "Voice not found",
  "message": "Voice does not exist or belongs to a provider you have not configured."
}
```

---

### POST /v1/synthesize

Generate speech from text using a connected provider.

**Request:**

```json
{
  "text": "Hello, welcome to Vokda.",
  "provider": "openai",
  "providerVoiceId": "alloy",
  "voiceName": "Alloy",
  "voiceId": "01KJZXZNF942...",
  "mode": "text",
  "options": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | ✓ | Input text (max 5,000 characters) |
| `provider` | string | ✓ | Provider ID (see [Supported Providers](#supported-providers)) |
| `providerVoiceId` | string | | Provider-specific voice identifier |
| `voiceName` | string | | Display name (stored with the clip) |
| `voiceId` | string | | Vokda catalog voice ID |
| `mode` | string | | `"text"` (default) or `"ssml"` |
| `options` | object | | Provider-specific options (format, model, speed, etc.) |

**Response (200):**

```json
{
  "jobId": "01KK1TYX403VB9KK398W",
  "status": "completed",
  "audioUrl": "https://...s3.amazonaws.com/...mp3?X-Amz-...",
  "fileSizeBytes": 253966,
  "durationMs": null,
  "latencyMs": 4259,
  "provider": "gemini-tts",
  "voiceId": "01KJZXZNF942...",
  "voiceName": "Kore",
  "createdAt": "2026-03-06T15:06:21.696Z"
}
```

The `audioUrl` is a presigned S3 URL valid for 7 days.

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{"error": "text is required"}` | Missing required field |
| 400 | `{"error": "Unsupported provider: foo", "supported": [...]}` | Unknown provider |
| 400 | `{"error": "no_credential", "message": "No API key configured for openai..."}` | No key stored for this provider |
| 400 | `{"error": "quota_exceeded", "message": "...", "usage": {...}}` | Storage quota exceeded |
| 401 | `{"error": "Missing Authorization header"}` | No auth token |
| 500 | `{"error": "Internal error", "message": "..."}` | Provider API failure |

**SSML mode:**

Set `"mode": "ssml"` and wrap your text in `<speak>` tags:

```json
{
  "text": "<speak><prosody rate=\"slow\">Welcome to Vokda.</prosody> <break time=\"500ms\"/> <emphasis level=\"strong\">The</emphasis> voice discovery platform.</speak>",
  "provider": "gcp-tts",
  "providerVoiceId": "en-US-Wavenet-D",
  "mode": "ssml"
}
```

---

### GET /v1/jobs

List your synthesis jobs (clips), newest first.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 50 | Max results (up to 200) |
| `status` | string | | Filter by status: `completed`, `pending`, `failed` |

**Response (200):**

```json
{
  "jobs": [
    {
      "jobId": "01KK1TYX403VB9KK398W",
      "voiceId": "01KJZXZNF942...",
      "voiceName": "Kore",
      "provider": "gemini-tts",
      "status": "completed",
      "inputText": "Hello! Welcome to Vokda.",
      "inputMode": "text",
      "clipName": "Gemini Kore Demo",
      "clipDescription": "First test with Kore voice",
      "clipTags": ["gemini", "kore", "test"],
      "audioUrl": "https://...presigned...",
      "fileSizeBytes": 253966,
      "durationMs": null,
      "latencyMs": 4259,
      "errorMessage": null,
      "createdAt": "2026-03-06T15:06:21.696Z"
    }
  ],
  "count": 1
}
```

---

### GET /v1/jobs/{id}

Get a single job by ID. Returns a refreshed presigned audio URL.

**Response (200):** Same shape as a single job object above.

**Response (404):** `{"error": "Job not found"}`

---

### PATCH /v1/jobs/{id}

Update a clip's metadata.

**Request:**

```json
{
  "clipName": "Hero Intro V2",
  "clipDescription": "Slow, dramatic hero introduction for trailer",
  "clipTags": ["trailer", "dramatic", "hero"]
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `clipName` | string \| null | Max 500 characters |
| `clipDescription` | string \| null | Max 500 characters |
| `clipTags` | string[] | Max 20 tags |

All fields are optional — only include the ones you want to change.

**Response (200):** Updated job object.

---

### DELETE /v1/jobs/{id}

Delete a clip and its audio file from S3.

**Response (200):**

```json
{
  "deleted": true,
  "freedBytes": 253966
}
```

---

### GET /v1/media/usage

Get your storage usage and quota.

**Response (200):**

```json
{
  "totalBytes": 1548230,
  "fileCount": 12,
  "quotaBytes": 5368709120,
  "usagePercent": 0,
  "remainingBytes": 5367160890
}
```

Default quota is 5 GB per user.

---

### POST /v1/keys

Create a new Vokda API key.

**Request:**

```json
{
  "label": "My CLI tool"
}
```

**Response (201):**

```json
{
  "keyId": "abc123...",
  "key": "vk_live_lmGF135y2EUukEUiNG3UBDN43XZpUNF5",
  "label": "My CLI tool",
  "createdAt": "2026-03-06T12:00:00.000Z"
}
```

> ⚠️ The full `key` value is returned **only on creation**. Store it securely — it cannot be retrieved again.

---

### GET /v1/keys

List your API keys (key values are masked).

**Response (200):**

```json
{
  "keys": [
    {
      "keyId": "abc123...",
      "label": "My CLI tool",
      "prefix": "vk_live_lmGF",
      "status": "active",
      "createdAt": "2026-03-06T12:00:00.000Z",
      "lastUsedAt": "2026-03-06T15:30:00.000Z"
    }
  ]
}
```

---

### DELETE /v1/keys/{id}

Revoke an API key. Immediate effect — all requests using this key will be rejected.

**Response (200):**

```json
{
  "revoked": true
}
```

---

## Supported Providers

Server-side synthesis is available for these 9 providers:

| Provider ID | Provider Name | Auth Type | Voice ID Format |
|-------------|--------------|-----------|----------------|
| `openai` | OpenAI | API key | `alloy`, `echo`, `fable`, `nova`, `onyx`, `shimmer` |
| `elevenlabs` | ElevenLabs | API key | ElevenLabs voice ID |
| `deepgram` | Deepgram | API key | Aura voice name (e.g. `aura-2-athena-en`) |
| `gemini-tts` | Google Gemini TTS | API key | Gemini voice name (e.g. `Kore`, `Puck`) |
| `cartesia` | Cartesia | API key | Cartesia voice UUID |
| `lmnt` | LMNT | API key | LMNT voice name |
| `gcp-tts` | Google Cloud TTS | API key | GCP voice name (e.g. `en-US-Wavenet-D`) |
| `azure-speech` | Azure Speech | Subscription key + region | Azure voice name (e.g. `en-US-JennyNeural`) |
| `aws-polly` | Amazon Polly | AWS credentials | Polly voice ID (e.g. `Joanna`) |

### SSML Support by Provider

| Provider | SSML | Notes |
|----------|------|-------|
| AWS Polly | ✓ | Full SSML + Amazon extensions |
| Azure Speech | ✓ | Full SSML + Microsoft extensions |
| Google Cloud TTS | ✓ | Full SSML |
| Edge TTS | ✓ | Via browser only (no server adapter) |
| Others | ✗ | Text mode only |

### Providers Not Available for Synthesis

These providers have voices in the catalog but no server-side synthesis:

| Provider | Type | Voices | Notes |
|----------|------|--------|-------|
| Edge TTS | Free cloud | 47 | Browser-only, no API key needed |
| Kokoro | Local model | 24 | Run locally via `mlx-audio` |
| Bark | Local model | 13 | Run locally via `mlx-audio` |
| Orpheus | Local model | 8 | Run locally via `mlx-audio` |
| KittenTTS | Local server | 8 | Self-hosted on port 8200 |
| Qwen3-TTS | Local model | 7 | Run locally via `mlx-audio` |
| Dia | Local model | 3 | Run locally via `mlx-audio` |

---

## Provider Credentials

The Synthesis API uses your stored provider API keys (BYOK). Keys are stored in DynamoDB with owner-only access — the API looks them up server-side when you make a synthesis request.

**To set up a provider:**

1. Get an API key from the provider (links in the web app at `/account/providers`)
2. Add it via the web app — keys are encrypted and stored per-user
3. Make synthesis requests using that provider

The API **never** accepts provider API keys in the request body. They are always resolved from your stored credentials.

---

## Rate Limits & Quotas

| Limit | Value |
|-------|-------|
| Max text length | 5,000 characters per request |
| Storage quota | 5 GB per user |
| Audio URL expiry | 7 days (request a fresh URL via GET /v1/jobs/{id}) |

Provider-side rate limits apply based on your API key tier with each provider.

---

## Error Handling

All error responses follow this format:

```json
{
  "error": "error_code_or_message",
  "message": "Human-readable description"
}
```

Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing Authorization header` | No Bearer token | Add `Authorization: Bearer <token>` |
| `Token expired` | JWT has expired | Refresh your session |
| `no_credential` | No API key for provider | Add key at `/account/providers` |
| `quota_exceeded` | Storage limit reached | Delete old clips |
| `Unsupported provider` | Unknown provider ID | Check [Supported Providers](#supported-providers) |
| Provider-specific errors | 401, 403, 429 from provider | Check your API key, quota, or rate limits |

---

## Provider Credentials (BYOK)

The Synthesis API uses Bring Your Own Key. Manage your stored provider API keys programmatically.

### POST /v1/credentials

Store or update a provider credential. One credential per provider (upsert).

**Request:**

```json
{
  "providerId": "openai",
  "credentialData": { "apiKey": "sk-your-key-here" },
  "label": "My OpenAI Key"
}
```

**Credential formats by auth type:**

| Auth Type | Providers | Format |
|-----------|-----------|--------|
| `api_key` | openai, elevenlabs, deepgram, cartesia, lmnt, gcp-tts, gemini-tts | `{"apiKey": "..."}` |
| `subscription_key` | azure-speech | `{"subscriptionKey": "...", "region": "eastus"}` |
| `aws_credentials` | aws-polly | `{"accessKeyId": "...", "secretAccessKey": "...", "region": "us-east-1"}` |

**Response (200):**

```json
{
  "providerId": "openai",
  "label": "My OpenAI Key",
  "authType": "api_key",
  "status": "active",
  "createdAt": "2026-03-06T12:00:00.000Z",
  "updatedAt": "2026-03-06T12:00:00.000Z"
}
```

---

### GET /v1/credentials

List your stored credentials with masked key values.

**Response (200):**

```json
{
  "credentials": [
    {
      "providerId": "openai",
      "label": "My OpenAI Key",
      "authType": "api_key",
      "status": "active",
      "maskedKey": "sk-p…MmcA",
      "createdAt": "2026-03-06T12:00:00.000Z",
      "updatedAt": "2026-03-06T12:00:00.000Z",
      "lastTestedAt": null
    }
  ],
  "count": 1
}
```

---

### POST /v1/credentials/test

Test a credential without storing it. Performs a minimal synthesis to verify the key works.

**Request:**

```json
{
  "providerId": "openai",
  "credentialData": { "apiKey": "sk-your-key-here" }
}
```

**Response (200):**

```json
{
  "success": true,
  "latencyMs": 305
}
```

Or on failure:

```json
{
  "success": false,
  "latencyMs": 305,
  "error": "OpenAI TTS 401: Incorrect API key provided..."
}
```

---

### DELETE /v1/credentials/{providerId}

Remove a stored credential.

**Response (200):**

```json
{
  "deleted": true,
  "providerId": "openai"
}
```

---

## Examples

### cURL — Discover Providers and Voices

```bash
# List your enabled providers
curl -H "Authorization: Bearer vk_live_YOUR_KEY" \
  https://api.vokda.iksnae.com/v1/providers

# See ALL providers (including ones you haven't set up)
curl -H "Authorization: Bearer vk_live_YOUR_KEY" \
  "https://api.vokda.iksnae.com/v1/providers?all=true"

# List voices from your enabled providers
curl -H "Authorization: Bearer vk_live_YOUR_KEY" \
  https://api.vokda.iksnae.com/v1/voices

# Filter voices: English, female, premium quality
curl -H "Authorization: Bearer vk_live_YOUR_KEY" \
  "https://api.vokda.iksnae.com/v1/voices?language=en&gender=female&quality=premium"

# Search voices by name
curl -H "Authorization: Bearer vk_live_YOUR_KEY" \
  "https://api.vokda.iksnae.com/v1/voices?search=jenny&limit=10"

# Filter by provider
curl -H "Authorization: Bearer vk_live_YOUR_KEY" \
  "https://api.vokda.iksnae.com/v1/voices?provider=openai"

# Get full voice detail
curl -H "Authorization: Bearer vk_live_YOUR_KEY" \
  https://api.vokda.iksnae.com/v1/voices/01KJZXZNF942C62SAR07KM4HBJ
```

---

### cURL — Synthesize with OpenAI

```bash
curl -X POST https://api.vokda.iksnae.com/v1/synthesize \
  -H "Authorization: Bearer vk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Welcome to the future of voice.",
    "provider": "openai",
    "providerVoiceId": "nova",
    "voiceName": "Nova"
  }'
```

### cURL — Synthesize with SSML (Azure)

```bash
curl -X POST https://api.vokda.iksnae.com/v1/synthesize \
  -H "Authorization: Bearer vk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "<speak><prosody rate=\"slow\" pitch=\"low\">This is a dramatic introduction.</prosody><break time=\"1s\"/><emphasis level=\"strong\">Vokda.</emphasis></speak>",
    "provider": "azure-speech",
    "providerVoiceId": "en-US-GuyNeural",
    "mode": "ssml"
  }'
```

### cURL — List and Download Clips

```bash
# List clips
curl -H "Authorization: Bearer vk_live_YOUR_KEY" \
  https://api.vokda.iksnae.com/v1/jobs

# Download audio
curl -H "Authorization: Bearer vk_live_YOUR_KEY" \
  https://api.vokda.iksnae.com/v1/jobs/01KK1TYX403VB9KK398W \
  | jq -r '.audioUrl' | xargs curl -o clip.mp3
```

### cURL — Update Clip Metadata

```bash
curl -X PATCH https://api.vokda.iksnae.com/v1/jobs/01KK1TYX403VB9KK398W \
  -H "Authorization: Bearer vk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "clipName": "Product Demo Intro",
    "clipDescription": "30-second intro for product walkthrough video",
    "clipTags": ["product", "intro", "demo"]
  }'
```

### cURL — Manage Provider Credentials

```bash
# Store a credential
curl -X POST https://api.vokda.iksnae.com/v1/credentials \
  -H "Authorization: Bearer vk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"providerId": "openai", "credentialData": {"apiKey": "sk-..."}}'

# Test a credential (dry run — not stored)
curl -X POST https://api.vokda.iksnae.com/v1/credentials/test \
  -H "Authorization: Bearer vk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"providerId": "openai", "credentialData": {"apiKey": "sk-..."}}'

# List credentials (masked)
curl https://api.vokda.iksnae.com/v1/credentials \
  -H "Authorization: Bearer vk_live_YOUR_KEY"

# Delete a credential
curl -X DELETE https://api.vokda.iksnae.com/v1/credentials/openai \
  -H "Authorization: Bearer vk_live_YOUR_KEY"
```

### cURL — Manage API Keys

```bash
# Create a key
curl -X POST https://api.vokda.iksnae.com/v1/keys \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"label": "CI Pipeline"}'

# List keys
curl -H "Authorization: Bearer eyJ..." \
  https://api.vokda.iksnae.com/v1/keys

# Revoke a key
curl -X DELETE https://api.vokda.iksnae.com/v1/keys/KEY_ID \
  -H "Authorization: Bearer eyJ..."
```
