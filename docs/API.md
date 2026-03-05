# API Baseline (MVP/Phase 2)

## Public

- `GET /voices`
  - returns catalog entries with filter params
- `GET /voices/:voiceId`
  - returns full voice details

## Authenticated

- `POST /synthesize`
  - generates preview audio for runnable variants
- `POST /cart/export`
  - returns `voice-pack.json` artifact payload

## Admin

- `POST /admin/ingest/run`
- `POST /admin/samples/regenerate`
- `GET /v1/admin/users?email=<email>` (admin only; Cognito lookup)
- `POST /v1/admin/users/roles` (admin only; set managed roles/groups)

## Notes

Current frontend reads catalog data from `apps/web/static/data/voices.json`. API routes are introduced when dynamic behavior is required.
