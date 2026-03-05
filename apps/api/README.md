# Vokda API (`apps/api`)

Backend scaffold for synthesis gateway, account/session checks, and future curation/admin APIs.

## Run

From repo root:

- `npm run dev:api`

Default endpoint:

- `http://127.0.0.1:8787`

## Environment

Copy `.env.example` values into your runtime environment:

- `PORT` API port (default `8787`)
- `VOKDA_API_CORS_ORIGIN` allowed web origin
- `VOKDA_AUTH_MODE`
  - `mock`: bearer token pattern maps to role
  - `none`: open (for local-only testing)
  - any other value reserved for real JWT verification

## Endpoints

- `GET /health`
- `GET /v1/auth/session` (requires bearer token unless `none`)
- `POST /v1/synthesize/preview` (requires bearer token unless `none`)

## Gateway Contract

`POST /v1/synthesize/preview` expects:

```json
{
  "sourceKey": "aws:polly:joanna",
  "variantId": "variant-ulid",
  "input": "Text or SSML input",
  "mode": "text"
}
```

Returns synthesis preview metadata used by web audition mode.
