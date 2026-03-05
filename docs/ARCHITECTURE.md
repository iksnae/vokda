# Vokda Architecture (MVP)

## 1. System Overview

Vokda MVP is static-first:

- SvelteKit frontend served by AWS Amplify
- Catalog data managed in the app codebase
- Audio samples can be introduced later via object storage/CDN
- Backend API deferred to phase 2 for synthesis/export/admin operations

## 2. Components

### Frontend (`apps/web`)

- SvelteKit app
- Catalog source currently lives at `apps/web/static/data/voices.json`
- Supports browse, search, filter, curation, and export over typed catalog data
- Curator metadata enrichment layer:
  - structured human labels
  - machine tags and use-case taxonomy
  - local override drafts and custom voice additions (to be moved to Amplify Data)

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
  - preview deployment from PR branch
- `production`:
  - production deployment from `main`

Required frontend env vars:

- `PUBLIC_APP_ENV`

## 5. Security Baseline

- No secrets committed to git
- Frontend only uses public-safe env vars (`PUBLIC_*`)
- Future backend secrets stored in AWS Secrets Manager or SSM Parameter Store
- Access tiers:
  - `visitor`: unauthenticated browsing
  - `guest`: registered baseline user (favorites, collections, cart/export)
  - `curator`: guest + curation workspace
  - `admin`: full admin workspace

## 6. Next Expansion (Phase 2)

- Add `apps/api` service (Lambda + API Gateway)
- Implement `POST /synthesize` and `POST /cart/export`
- Add ingestion pipeline for provider connectors
