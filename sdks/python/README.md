# vokda

Python SDK for the [Vokda](https://vokda.iksnae.com) TTS API — voice catalog browsing + synthesis.

**Zero dependencies** — uses only Python stdlib (`urllib`, `json`). Python 3.9+.

## Install

```bash
pip install vokda
```

## Quick Start

### Browse the Voice Catalog (no auth)

```python
from vokda import VokdaCatalogClient

catalog = VokdaCatalogClient()

# List all 550 voices
data = catalog.list_voices()
print(f"{len(data['voices'])} voices")

# Get a single voice
voice = catalog.get_voice("01JCW012A9N9Y3W08F0Q0A1O1")
print(voice["name"], voice["provider"])

# List providers with pricing
providers = catalog.list_providers()
for p in providers["providers"]:
    print(f"{p['name']}: {p['voiceCount']} voices, {p.get('freeTier', 'No free tier')}")
```

### Synthesize Speech (authenticated)

```python
from vokda import VokdaClient

client = VokdaClient(api_key="vk_live_...")

# Store provider credential (one-time)
client.save_credential("openai", {"apiKey": "sk-..."})

# Synthesize
clip = client.synthesize(
    text="Hello from Vokda!",
    provider="openai",
    provider_voice_id="alloy",
)
print(clip["audioUrl"])   # presigned S3 URL
print(clip["latencyMs"])  # synthesis time

# List clips
result = client.list_clips(limit=10)
for job in result["jobs"]:
    print(f"{job['voiceName']} ({job['provider']}): {job['fileSizeBytes']} bytes")

# Update clip metadata
client.update_clip(clip["jobId"], clip_name="Demo", clip_tags=["test"])

# Check usage
usage = client.get_usage()
print(f"{usage['fileCount']} clips, {usage['usagePercent']}% used")
```

### Error Handling

```python
from vokda import VokdaClient, VokdaApiError

try:
    client.synthesize(text="", provider="openai")
except VokdaApiError as e:
    print(f"Error {e.status}: {e.body['error']}")
```

## API Reference

| Method | Description |
|--------|-------------|
| `catalog.list_voices()` | List all voices |
| `catalog.get_voice(id)` | Get voice detail |
| `catalog.list_providers()` | List providers |
| `catalog.get_provider(id)` | Get single provider |
| `catalog.get_stats()` | Catalog statistics |
| `client.synthesize(...)` | Synthesize speech |
| `client.list_clips()` | List audio clips |
| `client.get_clip(id)` | Get clip (fresh URL) |
| `client.update_clip(id, ...)` | Update clip metadata |
| `client.delete_clip(id)` | Delete clip |
| `client.save_credential(...)` | Store provider key |
| `client.list_credentials()` | List credentials |
| `client.test_credential(...)` | Test key (dry run) |
| `client.delete_credential(id)` | Remove credential |
| `client.create_api_key()` | Create API key |
| `client.list_api_keys()` | List API keys |
| `client.revoke_api_key(id)` | Revoke key |
| `client.get_usage()` | Storage usage |
