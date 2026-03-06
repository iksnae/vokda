# Chore: Machine/Agent-Friendly Interface

## Goal
Enable AI agents, automation tools, and integrations to discover and consume the Vokda voice catalog programmatically.

## Approach
Since the app uses static adapter (no server runtime), we generate static JSON endpoints at build time via `+server.ts` prerendered routes, plus standard discovery files.

## Deliverables

### 1. REST-like JSON API (prerendered static files)
- `GET /api/v1/voices.json` — full catalog (filterable client-side)
- `GET /api/v1/voices/[id].json` — individual voice with full model card
- `GET /api/v1/providers.json` — provider registry with colors
- `GET /api/v1/stats.json` — catalog summary (counts, providers, capabilities)

### 2. OpenAPI spec
- `GET /api/v1/openapi.json` — OpenAPI 3.1 spec describing the API

### 3. Agent discovery
- `GET /.well-known/ai-plugin.json` — agent plugin manifest (ChatGPT/OpenAI plugin format)
- `GET /.well-known/agent.json` — generic agent discovery (emerging standard)

### 4. Crawlability
- `GET /sitemap.xml` — all voice detail pages
- `GET /robots.txt` — allow all, point to sitemap

### 5. Structured data (already partially done)
- JSON-LD on voice detail pages ✅
- og:audio with direct MP3 link ✅
