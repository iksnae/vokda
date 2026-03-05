# Vokda Architecture (MVP)

## 1. System Overview

Vokda MVP is static-first:

- SvelteKit frontend served by AWS Amplify
- Catalog and sample metadata stored in S3 as JSON
- Audio samples served from S3/CloudFront URLs
- Backend API deferred to phase 2 for synthesis/export/admin operations

## 2. Components

### Frontend (`apps/web`)

- SvelteKit app
- Reads catalog index from `PUBLIC_CATALOG_INDEX_URL`
- Supports browse, search, and filter over fetched catalog JSON

### Catalog Storage (S3)

Recommended key structure:

- `catalog/voices.json`
- `catalog/voices/{voiceId}.json`
- `samples/{voiceId}/{variantId}/{sampleId}.mp3`
- `exports/{exportId}/voice-pack.json`

## 3. Deployment

### Amplify

- Connected to private GitHub repo `iksnae/vokda`
- PR branches produce preview environments
- `main` branch deploys production frontend

### GitHub Actions

- Runs quality checks on push/pull request
- Does not deploy frontend directly; Amplify owns frontend deploy

## 4. Environments

- `preview`:
  - points to preview S3 catalog (or shared dev catalog)
- `production`:
  - points to production S3 catalog

Required frontend env vars:

- `PUBLIC_CATALOG_INDEX_URL`
- `PUBLIC_APP_ENV`

## 5. Security Baseline

- No secrets committed to git
- Frontend only uses public-safe env vars (`PUBLIC_*`)
- Future backend secrets stored in AWS Secrets Manager or SSM Parameter Store

## 6. Next Expansion (Phase 2)

- Add `apps/api` service (Lambda + API Gateway)
- Implement `POST /synthesize` and `POST /cart/export`
- Add ingestion pipeline for provider connectors
