# Feature: Unified Synthesis with S3 Media Management

## Summary

Wire end-to-end TTS synthesis on the voice detail page using BYOK credentials, persist generated audio to S3 under the user's storage path, track cumulative usage, and enforce a configurable per-user storage quota (default 5 GB).

## Design Principles

1. **BYOK only** — Vokda never pays provider bills; every synthesis call uses the user's own API key or OAuth token
2. **Client-side synthesis** — browser calls provider APIs directly (except AWS Polly which needs SigV4 proxy); no Lambda compute cost for most providers
3. **S3 for persistence** — generated audio saved to `users/{entity_id}/synth/{jobId}.mp3`; Amplify Storage handles per-user ACLs
4. **DynamoDB for metadata** — `SynthesisJob` records track what was generated; `UserMediaUsage` tracks cumulative bytes
5. **Lazy media management** — audio is playable immediately from a blob URL; S3 upload happens in the background; if it fails the user still has the audio in-session
6. **Cost-efficient cleanup** — S3 lifecycle rule auto-deletes files older than 90 days; users can manually delete files sooner

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Voice Detail Page                                                   │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Synthesis Panel                                               │  │
│  │  ┌─────────┐  ┌────────────────┐  ┌──────────────────────┐   │  │
│  │  │ Text    │  │ Synthesize ▶   │  │ Audio Player         │   │  │
│  │  │ Input   │  │ (BYOK adapter) │  │ (blob URL → S3 URL)  │   │  │
│  │  └─────────┘  └───────┬────────┘  └──────────┬───────────┘   │  │
│  └────────────────────────┼──────────────────────┼───────────────┘  │
│                           │                      │                   │
│                     ┌─────▼──────┐         ┌─────▼──────┐           │
│                     │ Provider   │         │ Background │           │
│                     │ API call   │         │ S3 upload  │           │
│                     │ (user key) │         │ (Amplify)  │           │
│                     └─────┬──────┘         └─────┬──────┘           │
│                           │                      │                   │
│                     ┌─────▼──────┐         ┌─────▼──────┐           │
│                     │ Audio blob │         │ S3 path:   │           │
│                     │ (instant   │         │ users/     │           │
│                     │  playback) │         │  {uid}/    │           │
│                     └────────────┘         │  synth/    │           │
│                                            │  {job}.mp3 │           │
│                                            └─────┬──────┘           │
│                                                  │                   │
│                                            ┌─────▼──────┐           │
│                                            │ DynamoDB   │           │
│                                            │ SynthJob   │           │
│                                            │ MediaUsage │           │
│                                            └────────────┘           │
└──────────────────────────────────────────────────────────────────────┘
```

## Existing Infrastructure

| Component | Status | Notes |
|---|---|---|
| S3 bucket (`vokdaAudio`) | ✅ Deployed | `users/{entity_id}/*` path with owner RW ACL |
| `SynthesisJob` DynamoDB table | ✅ Deployed | Owner-only auth, tracks job metadata |
| `UserProviderCredential` table | ✅ Deployed | Owner-only, stores API keys |
| Real synthesis adapters (9) | ✅ Built | Return audio as blob URLs |
| Credential store + OAuth | ✅ Built | Loads user keys, registers adapters |
| `synthesizePreview()` service | ✅ Built | Orchestrates adapter calls |
| Voice detail page audio player | ✅ Built | Plays from sample URLs, custom controls |

## What's New

### Milestone 1 — Synthesis Panel on Voice Detail

Add a synthesis input + button to the voice detail page that calls real adapters and plays the result.

**Files:**
- `apps/web/src/routes/voices/[id]/+page.svelte` — add synthesis panel below existing audio player
- `apps/web/src/lib/components/SynthesisPanel.svelte` — reusable synthesis UI component

**UX flow:**
1. User visits voice detail for a cloud-provider voice (e.g., OpenAI Alloy)
2. If user has no credential for that provider → show "Connect your OpenAI API key" banner with link to `/account/providers`
3. If user has credential → show text input (prefilled with default audition text) + "Synthesize" button
4. Click synthesize → adapter call → audio blob → play immediately
5. Show latency, provider, warnings in a result card below
6. "Synthesize" button shows spinner during call, disables to prevent double-fire

**Synthesis panel states:**
- `idle` — text input + button ready
- `synthesizing` — spinner, button disabled
- `result` — audio player + metadata card (provider, latency, input used)
- `error` — error message with retry button
- `no-credential` — banner linking to `/account/providers`
- `free-provider` — show local synthesis info (Edge TTS, local models)

### Milestone 2 — S3 Upload + SynthesisJob Tracking

After synthesis, persist audio to S3 and record the job in DynamoDB.

**Files:**
- `apps/web/src/lib/synthesis/media-store.ts` — S3 upload + signed URL generation
- `apps/web/src/lib/data/synthesis-jobs.ts` — CRUD for SynthesisJob records

**S3 path scheme:**
```
users/{entity_id}/synth/{jobId}.mp3
```

- `entity_id` = Cognito identity pool ID (from Amplify auth)
- `jobId` = ULID (time-sortable, unique)
- Content-Type: `audio/mpeg`

**Upload flow:**
1. Synthesis returns audio blob
2. Immediately play from blob URL (no wait for upload)
3. In background: upload blob to S3 via Amplify Storage `uploadData()`
4. On success: create `SynthesisJob` record in DynamoDB with `audioPath`, `status: 'completed'`
5. On failure: still play from blob; show subtle warning "Audio not saved to account"
6. Replace blob URL with S3 URL for subsequent plays (so page refresh still works)

**SynthesisJob record (already deployed, enhance fields):**
```
{
  id: ULID,
  voiceId: "01JCVK5F2Q2W5P4TQ8KT4NR1A1",
  voiceName: "Alloy",                    // denormalized for UI
  providerId: "openai",
  inputText: "Hello, this is a test.",
  inputMode: "text",
  status: "completed",
  audioPath: "users/{uid}/synth/{id}.mp3",
  audioUrl: "https://s3-url...",          // pre-signed or Amplify Storage URL
  fileSizeBytes: 48320,
  durationMs: 2400,
  latencyMs: 820,
  errorMessage: null,
  createdAtIso: "2026-03-05T..."
}
```

### Milestone 3 — Usage Tracking + 5 GB Quota

Track per-user storage consumption and enforce a configurable limit.

**Files:**
- `apps/web/src/lib/data/media-usage.ts` — usage calculation + quota check
- `amplify/data/resource.ts` — add `UserMediaUsage` model (or compute from SynthesisJob sum)

**Two approaches (choose one):**

**Option A — Computed from SynthesisJob (simpler, eventually consistent):**
```typescript
async function calculateUsage(): Promise<{ totalBytes: number; fileCount: number }> {
  const jobs = await listSynthesisJobs({ status: 'completed' });
  const totalBytes = jobs.reduce((sum, j) => sum + (j.fileSizeBytes ?? 0), 0);
  return { totalBytes, fileCount: jobs.length };
}
```
- ✅ No extra table; single source of truth
- ❌ Slow if thousands of jobs; needs client-side sum

**Option B — Dedicated counter (fast reads, increment on upload):**  ← **Recommended**
```
UserMediaUsage model:
  userId: owner (partition key via allow.owner())
  totalBytes: integer (default 0)
  fileCount: integer (default 0)
  quotaBytes: integer (default 5368709120 = 5 GB)
  lastUpdatedAtIso: string
```
- ✅ O(1) read for quota check
- ✅ Can set per-user quota (admin override)
- ❌ Counter can drift from actual S3 usage (fix: periodic reconciliation)

**Quota enforcement:**
1. Before synthesis: `if (usage.totalBytes + estimatedSize > usage.quotaBytes)` → block with message
2. After upload: increment `totalBytes` and `fileCount`
3. After delete: decrement
4. Estimated size: `inputText.length * 20` bytes (conservative MP3 estimate)
5. Actual size recorded after upload completes

**UI:**
- Usage bar on `/account/providers` page: "2.3 GB / 5.0 GB used"
- Warning at 80%: "Storage almost full"
- Block at 100%: "Storage full — delete old generations or contact support"
- Link to media library to manage/delete files

### Milestone 4 — Media Library Page

User can browse, play, and delete their generated audio files.

**Files:**
- `apps/web/src/routes/account/media/+page.svelte` — media library
- `apps/web/src/routes/account/media/+page.ts` — prerender false

**UX:**
- List of synthesis jobs sorted by newest first
- Each item: voice name, provider badge, input text preview, date, file size, play button
- Bulk select + delete
- Storage usage summary at top
- Filter by provider, voice, date range
- Download button (direct S3 link)
- Empty state: "No generated audio yet. Synthesize a voice to get started."

---

## Schema Changes — `amplify/data/resource.ts`

### Enhanced SynthesisJob (update existing)

```typescript
SynthesisJob: a
  .model({
    voiceId: a.string().required(),
    voiceName: a.string(),              // NEW: denormalized
    providerId: a.string().required(),
    inputText: a.string().required(),
    inputMode: a.enum(['text', 'ssml']),
    status: a.enum(['pending', 'completed', 'failed']),
    audioPath: a.string(),
    audioUrl: a.string(),               // NEW: resolved URL for playback
    fileSizeBytes: a.integer(),         // NEW: actual file size after upload
    durationMs: a.integer(),
    latencyMs: a.integer(),
    errorMessage: a.string(),
    createdAtIso: a.string().required()
  })
  .authorization((allow) => [allow.owner()]),
```

### New UserMediaUsage

```typescript
UserMediaUsage: a
  .model({
    totalBytes: a.integer().default(0),
    fileCount: a.integer().default(0),
    quotaBytes: a.integer().default(5368709120),  // 5 GB
    lastUpdatedAtIso: a.string().required()
  })
  .authorization((allow) => [allow.owner()]),
```

---

## New Modules

### `apps/web/src/lib/synthesis/media-store.ts`

```typescript
/** Upload synthesis audio to S3, return storage URL. */
export async function uploadSynthesisAudio(
  jobId: string,
  audioBlob: Blob
): Promise<{ path: string; url: string; sizeBytes: number }>;

/** Delete synthesis audio from S3. */
export async function deleteSynthesisAudio(audioPath: string): Promise<void>;

/** Get a playable URL for a stored audio file. */
export async function getSynthesisAudioUrl(audioPath: string): Promise<string>;
```

### `apps/web/src/lib/data/synthesis-jobs.ts`

```typescript
/** Create a synthesis job record after successful synthesis. */
export async function createSynthesisJob(job: Omit<SynthesisJob, 'id'>): Promise<SynthesisJob>;

/** List user's synthesis jobs (newest first). */
export async function listSynthesisJobs(filters?: {
  status?: string;
  providerId?: string;
  limit?: number;
}): Promise<SynthesisJob[]>;

/** Delete a synthesis job and its audio file. */
export async function deleteSynthesisJob(jobId: string, audioPath?: string): Promise<void>;

/** Delete multiple jobs (bulk). */
export async function deleteSynthesisJobs(jobIds: string[]): Promise<void>;
```

### `apps/web/src/lib/data/media-usage.ts`

```typescript
/** Get current usage for the authenticated user. */
export async function getMediaUsage(): Promise<UserMediaUsage>;

/** Check if user has enough quota for a new synthesis. */
export async function checkQuota(estimatedBytes: number): Promise<{
  allowed: boolean;
  currentBytes: number;
  quotaBytes: number;
  remainingBytes: number;
}>;

/** Increment usage after successful upload. */
export async function incrementUsage(sizeBytes: number): Promise<void>;

/** Decrement usage after file deletion. */
export async function decrementUsage(sizeBytes: number): Promise<void>;

/** Reconcile usage with actual S3 contents (admin/cron). */
export async function reconcileUsage(): Promise<void>;
```

### `apps/web/src/lib/components/SynthesisPanel.svelte`

Reusable component placed on voice detail page:
```svelte
<SynthesisPanel {voice} />
```

Props:
- `voice: Voice` — the voice to synthesize
- Internally reads credentials store, checks quota, handles synthesis lifecycle

---

## Component: SynthesisPanel

### States

```
┌──────────────┐    credential    ┌──────────────┐
│ no-credential│───────found─────▶│    idle       │
│              │                  │  [text input] │
│ "Connect key"│                  │  [Synthesize] │
└──────────────┘                  └──────┬───────┘
                                         │ click
                                   ┌─────▼──────┐
                                   │synthesizing │
                                   │  [spinner]  │
                                   └──────┬──────┘
                              ┌───────────┼───────────┐
                              │ success   │           │ error
                        ┌─────▼──────┐           ┌───▼────────┐
                        │  result    │           │   error     │
                        │ [player]   │           │ [message]   │
                        │ [metadata] │           │ [retry]     │
                        │ [save ✓]   │           └─────────────┘
                        └────────────┘
```

### Metadata Card (shown after synthesis)

```
┌────────────────────────────────────────┐
│ ▶ 00:00 ━━━━━━━━━━━━━━━━━━━ 00:02    │
│                                        │
│ Provider: OpenAI · tts-1               │
│ Latency: 820ms · Size: 47 KB          │
│ Input: "Hello, this is a test..."      │
│                                        │
│ [💾 Saved to account]  [🔗 Download]   │
└────────────────────────────────────────┘
```

---

## Quota UX

### Usage Display (on /account/providers and /account/media)

```
┌─────────────────────────────────────────────────┐
│  Storage  ██████████████░░░░░░░░  2.3 / 5.0 GB  │
│           46% used · 142 files                   │
└─────────────────────────────────────────────────┘
```

### Warning States

| Usage % | Behavior |
|---------|----------|
| 0–79% | Normal — green bar |
| 80–94% | Warning — amber bar, "Storage almost full" |
| 95–99% | Critical — red bar, "Storage nearly full — delete old files" |
| 100% | Blocked — red bar, synthesis button disabled, "Storage full" |

---

## Cost Analysis

| Component | Cost at 1K MAU | Cost at 10K MAU |
|---|---|---|
| S3 storage (avg 500 MB/user × 100 active users) | ~$1.15/mo | ~$11.50/mo |
| S3 PUT requests (avg 50 synths/user/mo × 100) | ~$0.03 | ~$0.25 |
| S3 GET requests (replays) | ~$0.02 | ~$0.20 |
| DynamoDB writes (SynthesisJob + MediaUsage) | ~$0.05 | ~$0.50 |
| DynamoDB reads (quota checks, job listing) | ~$0.01 | ~$0.10 |
| **Provider API costs** | **$0 (user pays)** | **$0 (user pays)** |
| **Total Vokda cost** | **~$1.26/mo** | **~$12.55/mo** |

S3 lifecycle rule (90-day auto-delete) keeps storage bounded.

---

## S3 Lifecycle Rule

```json
{
  "Rules": [{
    "ID": "auto-delete-user-synth-90d",
    "Status": "Enabled",
    "Filter": { "Prefix": "users/" },
    "Expiration": { "Days": 90 }
  }]
}
```

Users are warned before files auto-delete. Download button always available.

---

## Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PUBLIC_SYNTH_MODE` | No | `mock` | Set to `byok` to enable real synthesis |
| `PUBLIC_MAX_SYNTH_QUOTA_BYTES` | No | `5368709120` | Default quota (5 GB) |

---

## Sequencing

| Milestone | What | LOE | Dependencies |
|---|---|---|---|
| **M1** | Synthesis panel on voice detail | 1 session | Credentials store (done) |
| **M2** | S3 upload + SynthesisJob tracking | 1 session | M1, Amplify Storage (deployed) |
| **M3** | Usage tracking + 5 GB quota | 1 session | M2 |
| **M4** | Media library page | 1 session | M3 |

Each milestone is independently deployable and valuable.

---

## Testing Plan

### Unit Tests
- `SynthesisPanel` state machine: no-cred → idle → synthesizing → result/error
- `media-store.ts`: upload, delete, URL generation (mocked S3)
- `synthesis-jobs.ts`: CRUD operations (mocked AppSync)
- `media-usage.ts`: quota check, increment, decrement, edge cases (0, 100%, over)

### Integration Tests (Playwright)
- Sign in → navigate to voice detail → verify synthesis panel appears
- Connect API key → synthesize → verify audio plays
- Verify usage bar updates after synthesis
- Verify media library shows new entry
- Verify delete removes from library and decrements usage

### Manual Verification
- M1: Synthesize with each provider → audio plays → no console errors
- M2: Refresh page after synthesis → audio still plays (from S3, not blob)
- M3: Synthesize until near quota → verify warning → verify block at limit
- M4: Browse media library → play, download, bulk delete

---

## Files Changed / Created

### New Files
- `apps/web/src/lib/components/SynthesisPanel.svelte`
- `apps/web/src/lib/synthesis/media-store.ts`
- `apps/web/src/lib/data/synthesis-jobs.ts`
- `apps/web/src/lib/data/media-usage.ts`
- `apps/web/src/routes/account/media/+page.svelte`
- `apps/web/src/routes/account/media/+page.ts`

### Modified Files
- `amplify/data/resource.ts` — enhance SynthesisJob, add UserMediaUsage
- `apps/web/src/lib/types.ts` — add UserMediaUsage type, enhance SynthesisJob
- `apps/web/src/lib/synthesis/service.ts` — add `synthesizeAndSave()` orchestrator
- `apps/web/src/routes/voices/[id]/+page.svelte` — add SynthesisPanel
- `apps/web/src/routes/account/providers/+page.svelte` — add usage bar
- `apps/web/src/routes/+layout.svelte` — add Media nav link

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| CORS blocks browser→provider API | Synthesis fails for some providers | Test each provider; proxy via apps/api for blocked ones |
| Blob URL revoked before S3 upload | Audio lost on page nav | Start upload immediately; warn if navigating during upload |
| Usage counter drifts from actual S3 | Quota inaccurate | Periodic reconciliation; always allow small buffer (5.1 GB actual) |
| Provider rate limits hit by user | Synthesis fails | Surface provider error message; suggest waiting |
| Large audio files from long text | Unexpected storage use | Warn on inputs > 2000 chars; show estimated file size before synth |
