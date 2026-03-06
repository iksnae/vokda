# @vokda/sdk

TypeScript SDK for the [Vokda](https://vokda.iksnae.com) TTS API — voice catalog browsing + synthesis.

**Zero dependencies.** Works in Node.js 18+ and modern browsers.

## Installation

```bash
npm install @vokda/sdk
```

## Quick Start

### Browse the Voice Catalog (no auth)

```ts
import { VokdaCatalogClient } from '@vokda/sdk';

const catalog = new VokdaCatalogClient();

// List all 550 voices
const { voices } = await catalog.listVoices();
console.log(`${voices.length} voices`);

// Get a single voice
const voice = await catalog.getVoice('01JCW012A9N9Y3W08F0Q0A1O1');
console.log(voice.name, voice.provider, voice.languages);

// List providers with pricing info
const { providers } = await catalog.listProviders();
for (const p of providers) {
  console.log(`${p.name}: ${p.voiceCount} voices, ${p.freeTier || 'No free tier'}`);
}

// Catalog stats
const stats = await catalog.getStats();
console.log(`${stats.totalVoices} voices, ${stats.totalProviders} providers, ${stats.totalLanguages} languages`);
```

### Synthesize Speech (authenticated)

```ts
import { VokdaClient } from '@vokda/sdk';

const vokda = new VokdaClient({ apiKey: 'vk_live_...' });

// 1. Store your provider API key (one-time)
await vokda.saveCredential({
  providerId: 'openai',
  credentialData: { apiKey: 'sk-...' },
});

// 2. Synthesize
const clip = await vokda.synthesize({
  text: 'Hello from Vokda!',
  provider: 'openai',
  providerVoiceId: 'alloy',
  voiceName: 'Alloy',
});

console.log(clip.audioUrl);    // presigned S3 URL (7-day expiry)
console.log(clip.latencyMs);   // synthesis time in ms
console.log(clip.fileSizeBytes);
```

### Manage Clips

```ts
// List all clips
const { jobs, count } = await vokda.listClips({ limit: 50 });

// Update clip metadata
await vokda.updateClip(clip.jobId, {
  clipName: 'Welcome message',
  clipTags: ['greeting', 'openai'],
});

// Get fresh audio URL
const refreshed = await vokda.getClip(clip.jobId);

// Delete
await vokda.deleteClip(clip.jobId);
```

### Manage Credentials

```ts
// List stored credentials (keys are masked)
const { credentials } = await vokda.listCredentials();
// → [{ providerId: 'openai', maskedKey: 'sk-p…MmcA', status: 'active' }]

// Test a credential without storing it
const test = await vokda.testCredential({
  providerId: 'openai',
  credentialData: { apiKey: 'sk-...' },
});
console.log(test.success, test.latencyMs);

// Remove
await vokda.deleteCredential('openai');
```

### Manage API Keys

```ts
// Create a new Vokda API key (full key shown once)
const key = await vokda.createApiKey('my-app');
console.log(key.key); // vk_live_...

// List keys
const { keys } = await vokda.listApiKeys();

// Revoke
await vokda.revokeApiKey(key.id);
```

### Storage Usage

```ts
const usage = await vokda.getUsage();
console.log(`${usage.fileCount} clips, ${usage.totalBytes} bytes, ${usage.usagePercent}% used`);
```

## Error Handling

```ts
import { VokdaApiError } from '@vokda/sdk';

try {
  await vokda.synthesize({ text: 'Hello', provider: 'openai', providerVoiceId: 'alloy' });
} catch (err) {
  if (err instanceof VokdaApiError) {
    console.error(`API error ${err.status}: ${err.body.error}`);
    // err.body.message — human-readable detail
    // err.body.supported — available values (if applicable)
  }
}
```

## Configuration

```ts
// Custom base URLs (for local development)
const vokda = new VokdaClient({
  apiKey: 'vk_live_...',
  baseUrl: 'http://localhost:5173',       // catalog
  synthesisBaseUrl: 'http://localhost:3000', // API
});
```

## Types Only

Import just the types without any runtime code:

```ts
import type { Voice, Provider, Clip, SynthesizeRequest } from '@vokda/sdk/types';
```

## API Reference

See the [OpenAPI spec](https://vokda.iksnae.com/api/v1/openapi.json) for full endpoint documentation.

| Method | Endpoint | SDK Method |
|--------|----------|------------|
| `GET` | `/api/v1/voices.json` | `catalog.listVoices()` |
| `GET` | `/api/v1/voices/{id}.json` | `catalog.getVoice(id)` |
| `GET` | `/api/v1/providers.json` | `catalog.listProviders()` |
| `GET` | `/api/v1/stats.json` | `catalog.getStats()` |
| `POST` | `/v1/synthesize` | `client.synthesize(req)` |
| `GET` | `/v1/jobs` | `client.listClips(opts?)` |
| `GET` | `/v1/jobs/{id}` | `client.getClip(id)` |
| `PATCH` | `/v1/jobs/{id}` | `client.updateClip(id, update)` |
| `DELETE` | `/v1/jobs/{id}` | `client.deleteClip(id)` |
| `POST` | `/v1/credentials` | `client.saveCredential(req)` |
| `GET` | `/v1/credentials` | `client.listCredentials()` |
| `POST` | `/v1/credentials/test` | `client.testCredential(req)` |
| `DELETE` | `/v1/credentials/{id}` | `client.deleteCredential(id)` |
| `POST` | `/v1/keys` | `client.createApiKey(label?)` |
| `GET` | `/v1/keys` | `client.listApiKeys()` |
| `DELETE` | `/v1/keys/{id}` | `client.revokeApiKey(id)` |
| `GET` | `/v1/media/usage` | `client.getUsage()` |

## Supported Providers

| Provider | Auth Type | Credential Format |
|----------|-----------|-------------------|
| OpenAI | `api_key` | `{ apiKey: 'sk-...' }` |
| ElevenLabs | `api_key` | `{ apiKey: 'xi-...' }` |
| Deepgram | `api_key` | `{ apiKey: 'dg-...' }` |
| Cartesia | `api_key` | `{ apiKey: 'sk_car_...' }` |
| LMNT | `api_key` | `{ apiKey: 'lmnt-...' }` |
| Google TTS | `api_key` | `{ apiKey: 'AIza...' }` |
| Gemini TTS | `api_key` | `{ apiKey: 'AIza...' }` |
| Azure Speech | `subscription_key` | `{ subscriptionKey: '...', region: 'eastus' }` |
| AWS Polly | `aws_credentials` | `{ accessKeyId: '...', secretAccessKey: '...', region: 'us-east-1' }` |
