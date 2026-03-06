# Vokda API — Overview

This document is an index. For full documentation, see:

- **[SYNTHESIS_API.md](./SYNTHESIS_API.md)** — Synthesis API reference (endpoints, auth, providers, examples)
- **[DISCOVERY.md](./DISCOVERY.md)** — Voice discovery guide (browse, search, filter, SSML editor, collections, clips)

## Quick Links

| Resource | URL |
|----------|-----|
| **App** | https://vokda.iksnae.com |
| **API base** | https://api.vokda.iksnae.com |
| **Catalog** | 550 voices across 25 providers |
| **Synthesis** | 9 providers with server-side adapters |

## API Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/synthesize` | ✓ | Generate speech from text or SSML |
| GET | `/v1/jobs` | ✓ | List your clips |
| GET | `/v1/jobs/{id}` | ✓ | Get clip with fresh audio URL |
| PATCH | `/v1/jobs/{id}` | ✓ | Update clip name/description/tags |
| DELETE | `/v1/jobs/{id}` | ✓ | Delete clip and audio |
| GET | `/v1/media/usage` | ✓ | Storage quota and usage |
| POST | `/v1/keys` | ✓ | Create API key |
| GET | `/v1/keys` | ✓ | List API keys |
| DELETE | `/v1/keys/{id}` | ✓ | Revoke API key |

Authentication: `Authorization: Bearer vk_live_...` (API key) or `Bearer eyJ...` (Cognito JWT).

See [SYNTHESIS_API.md](./SYNTHESIS_API.md) for full request/response documentation and examples.
