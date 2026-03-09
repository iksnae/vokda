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
| GET | `/v1/providers` | ✓ | List enabled providers (`?all=true` for full catalog) |
| GET | `/v1/voices` | ✓ | List voices from enabled providers (filterable) |
| GET | `/v1/voices/{id}` | ✓ | Voice detail (samples, variants, model card) |
| GET | `/v1/jobs` | ✓ | List your clips |
| GET | `/v1/jobs/{id}` | ✓ | Get clip with fresh audio URL |
| PATCH | `/v1/jobs/{id}` | ✓ | Update clip name/description/tags |
| DELETE | `/v1/jobs/{id}` | ✓ | Delete clip and audio |
| GET | `/v1/media/usage` | ✓ | Storage quota and usage |
| POST | `/v1/credentials` | ✓ | Store provider credential (BYOK) |
| GET | `/v1/credentials` | ✓ | List credentials (masked) |
| POST | `/v1/credentials/test` | ✓ | Test credential (dry run) |
| DELETE | `/v1/credentials/{provider}` | ✓ | Remove credential |
| POST | `/v1/keys` | ✓ | Create API key |
| GET | `/v1/keys` | ✓ | List API keys |
| DELETE | `/v1/keys/{id}` | ✓ | Revoke API key |

### Catalog API (Public, No Auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/voices.json` | Full voice catalog (550 voices) |
| GET | `/api/v1/voices/{id}.json` | Individual voice detail |
| GET | `/api/v1/providers.json` | Provider directory with pricing, links |
| GET | `/api/v1/stats.json` | Catalog statistics |
| GET | `/api/v1/openapi.json` | OpenAPI 3.1 spec (all endpoints) |

Authentication: `Authorization: Bearer vk_live_...` (API key) or `Bearer eyJ...` (Cognito JWT).

See [SYNTHESIS_API.md](./SYNTHESIS_API.md) for full request/response documentation and examples.
