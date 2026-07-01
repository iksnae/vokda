# Vokda

Vokda is a voice discovery and curation app for exploring TTS voices across cloud providers and open model ecosystems.

## Stack

- UI: SvelteKit (TypeScript)
- Frontend hosting: AWS Amplify
- Catalog data: app-owned module (phase 1), API-backed later
- SCM + CI/CD: GitHub (private repo under `iksnae`)

## Repo Layout

- `apps/web` SvelteKit frontend
- `apps/api` backend placeholder (preview synthesis/export/admin)
- `packages/shared` shared types/schemas placeholder
- `infra` infrastructure-as-code placeholder
- `docs` implementation documents

## Quick Start

1. Install dependencies:
   - `npm install`
2. Configure env:
   - copy `apps/web/.env.example` to `apps/web/.env`
3. Run web app:
   - `npm run dev:web`

## CI/CD

- GitHub Actions runs lint/typecheck/build checks.
- AWS Amplify handles preview and production frontend deployments from GitHub branches.
- `amplify.yml` is configured for monorepo builds with `apps/web` as the app root.

## Product Docs

- Product requirements: `PRD.md`
- Architecture baseline: `docs/ARCHITECTURE.md`
- Delivery plan: `docs/ROADMAP.md`
- API baseline: `docs/API.md`
- Data model baseline: `docs/SCHEMA.md`
- Amplify backend setup: `docs/AMPLIFY_BACKEND_GEN2.md`
- Provider ID stability & deprecation policy: `docs/PROVIDER_IDS.md`
- Glossary: `docs/GLOSSARY.md`
