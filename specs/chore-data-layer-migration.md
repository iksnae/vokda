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

## Completed (Phase 2)

### S3 Audio Upload ✅
- `scripts/upload-audio-s3.mjs` — uploads audio, images, OG images to S3
- 550 audio samples + 551 voice images + 550 OG images uploaded
- Bucket has public access blocked (Amplify Storage design) — catalog assets
  continue serving from Amplify Hosting CDN which is free and fast
- S3 bucket reserved for user-generated audio (BYOK synthesis M3)

### Curation Page Wired to VoiceRecord ✅
- Tabbed UI: Metadata Editor / New Voice / Database
- Database tab shows all VoiceRecords with publish/archive/delete actions
- Stats bar: total, published, draft, archived counts
- "Save to database" toggle on metadata editor and voice draft forms
- Metadata saves propagate to both local store AND DynamoDB VoiceRecord

### Admin Page Wired to ProviderRecord ✅
- Tabbed UI: User Roles / Providers
- Provider cards show DB sync status ("DB · N voices" or "local only")
- Provider create/save syncs to both local catalog AND DynamoDB ProviderRecord
- Voice count from DB displayed per provider

### Icon Component Extended
- Added 10 new Phosphor icons: User, Users, Globe, Info, Minus, Pencil,
  Desktop, Microphone, ChatCircle, CaretUp
- Total: 32 icon mappings in Icon.svelte

## Remaining Work

- [ ] M3: BYOK synthesis (UserProviderCredential, SynthesisJob, credential encryption)
