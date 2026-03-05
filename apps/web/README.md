# Vokda Web (`apps/web`)

SvelteKit frontend for catalog browsing and early curation UX.

## Local Development

1. Install workspace dependencies from repo root:
   - `npm install`
2. Create local env file:
   - `cp apps/web/.env.example apps/web/.env`
3. Start dev server from repo root:
   - `npm run dev:web`

## Environment Variables

- `PUBLIC_APP_ENV`
  - Environment label shown/used by frontend logic (`local`, `preview`, `production`)
- `PUBLIC_SYNTH_MODE`
  - `mock` (default) uses local adapter stubs with browser playback fallback
  - `gateway` posts preview requests to `PUBLIC_SYNTH_GATEWAY_URL`
- `PUBLIC_SYNTH_GATEWAY_URL`
  - Required when `PUBLIC_SYNTH_MODE=gateway`
  - Expected endpoint: `POST` JSON payload for audition synthesis

## Catalog Contract (Current)

Catalog is currently managed in JSON at:

- `apps/web/static/data/voices.json`

Frontend expects each entry to follow:

```json
{
  "voices": [
    {
      "id": "...",
      "name": "...",
      "description": "...",
      "tags": ["..."],
      "languages": ["en-US"],
      "qualityTier": "basic|standard|premium",
      "variants": [
        {
          "id": "...",
          "sourceType": "cloud_provider|hf_model|hf_space|hf_endpoint|self_hosted",
          "runnable": true,
          "supportsSsml": false
        }
      ]
    }
  ]
}
```

## Build

From repo root:

- `npm run build:web`

Output directory is `apps/web/build` (static adapter), aligned with `amplify.yml`.

## Amplify Notes

- Amplify app root: `apps/web`
- Build spec is kept in repo root `amplify.yml`
- Configure branch env vars in Amplify Console:
  - `PUBLIC_APP_ENV`
