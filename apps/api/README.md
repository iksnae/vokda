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
  - `cognito`: verify access token against Cognito JWKs
- `VOKDA_AWS_REGION` Cognito region for admin APIs/JWT verifier
- `VOKDA_COGNITO_USER_POOL_ID` user pool id for JWT verification
- `VOKDA_COGNITO_CLIENT_ID` app client id for JWT verification
- `VOKDA_COGNITO_TARGET_USER_POOL_ID` target pool for admin user/group operations

## Endpoints

- `GET /health`
- `GET /v1/auth/session` (requires bearer token unless `none`)
- `POST /v1/synthesize/preview` (requires bearer token unless `none`)
- `GET /v1/admin/users?email=<email>` (admin only)
- `POST /v1/admin/users/roles` (admin only)

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
