# Chore: OpenAPI Spec + TypeScript SDK

## Goal
Ship a complete OpenAPI 3.1 spec with full request/response schemas, and a zero-dependency TypeScript SDK client that covers both the public Catalog API and the authenticated Synthesis API.

## Deliverables

### 1. OpenAPI Spec (enriched)
- Full `components/schemas` for every response type (Voice, Provider, Clip, Credential, ApiKey, Usage, Stats, Error)
- Request body schemas with examples
- Response schemas on every endpoint
- Error response schemas (400, 401, 404)
- Regenerated via `scripts/generate-api-catalog.mjs`

### 2. TypeScript SDK (`packages/sdk`)
- Zero-dependency, works in Node.js + browser
- `VokdaCatalogClient` — public, no auth needed
- `VokdaClient` — authenticated (API key or JWT)
- Full types for all models
- Methods map 1:1 to OpenAPI operationIds
- Ships as ESM with `.d.ts` declarations
- `npm run build:sdk` to compile

### 3. Integration
- `packages/sdk/package.json` wired into workspace
- README with usage examples
- Export `types.ts` separately for consumers who just want types

## Non-goals
- No code generation tool (hand-written SDK is simpler for 13 endpoints)
- No publishing to npm yet (internal workspace package)
