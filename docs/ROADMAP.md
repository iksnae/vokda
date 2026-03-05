# Vokda Roadmap (Initial)

## Phase 0: Foundation (Current)

- Establish monorepo structure
- Add SvelteKit app scaffold
- Set up GitHub CI checks
- Connect Amplify to repo

## Phase 1: Catalog UX

- Build catalog list and detail routes
- Implement search/filter in UI
- Maintain curated catalog in `apps/web/static/data/voices.json`

## Phase 2: Curation and Cart

- Add local collection support
- Add cart state for voice variants
- Implement export payload generation in frontend

## Phase 3: Backend API

- Add `apps/api` with synthesis and export endpoints
- Add auth/rate limiting design
- Move export operation server-side

## Phase 4: Ingestion and Admin

- Implement ingestion jobs for HF allowlist + 1 cloud provider
- Build admin workflows for curation and sample regeneration
