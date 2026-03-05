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

## Notes

During Phase 1, frontend reads catalog data from an app-owned data module. API routes are introduced when dynamic behavior is required.
