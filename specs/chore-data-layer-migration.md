# Chore: Data Layer Migration — M1 + M2 Infrastructure

**Completed**: March 5, 2026

## What Was Done

### M1 — DynamoDB as Source of Truth ✅

1. **Schema deployed**: `VoiceRecord` (20 fields) and `ProviderRecord` (13 fields) tables created in DynamoDB via `npx ampx sandbox --once`
2. **Data seeded**: 550 voices + 26 providers written to DynamoDB using AWS SDK `BatchWriteCommand` (direct DynamoDB access, bypasses AppSync auth)
3. **`--from-db` pipeline**: `publish-catalog.mjs` now supports `--from-db` flag that queries AppSync (API key auth), fetches all published VoiceRecords, and generates the static JSON catalog
4. **Voice store CRUD**: `voice-store.ts` now has full AppSync CRUD functions for curator/admin pages:
   - `listVoiceRecords()`, `getVoiceRecord()`, `saveVoiceRecord()`, `deleteVoiceRecord()`
   - `listProviderRecords()`, `saveProviderRecord()`
5. **Schema auth updated**: VoiceRecord/ProviderRecord now also allow `authenticated('identityPool')` read access

### M2 — S3 Storage Infrastructure ✅

1. **S3 bucket deployed**: `vokdaAudio` bucket created via Amplify Storage
   - `catalog/*`: guest read, admin write
   - `users/{entity_id}/*`: per-user read/write
2. **CDN helper**: `apps/web/src/lib/audio/cdn.ts` resolves audio URLs (S3 when `PUBLIC_AUDIO_BASE_URL` set, static fallback for dev)
3. **Backend registered**: storage wired into `amplify/backend.ts`

### Tests
- 110 tests passing (7 new tests for voice store CRUD, seed script, publish pipeline)

## Deployed Resources

| Resource | Table/Bucket | Items |
|----------|-------------|-------|
| VoiceRecord | `VoiceRecord-qye3mrxz5rcfjpgw4uebq6emfi-NONE` | 550 |
| ProviderRecord | `ProviderRecord-qye3mrxz5rcfjpgw4uebq6emfi-NONE` | 26 |
| S3 Storage | `amplify-vokda-k-sandbox-b-vokdaaudiobucketc3e7c340-mmsdwvur4tui` | empty (audio upload deferred) |
| AppSync API | `fzstnqh5p5glrout7qs7ys4shu.appsync-api.us-east-1.amazonaws.com` | 8 models |

## Remaining Work

- [ ] Upload audio files to S3 (`scripts/upload-audio-s3.mjs`)
- [ ] Set `PUBLIC_AUDIO_BASE_URL` in production
- [ ] Wire curation page to use VoiceRecord CRUD
- [ ] Wire admin page to use ProviderRecord CRUD
- [ ] M3: BYOK synthesis (UserProviderCredential, SynthesisJob, credential encryption)
