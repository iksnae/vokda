# Feature: Unified Synthesis API with Server-Side Media Management

## Summary

Build a server-side synthesis API backed by Lambda + SQS that allows any client (browser, CLI, SDK, integrations) to generate TTS audio using the Vokda API. Users authenticate with a **Vokda API key**, and the backend resolves their stored provider credentials server-side. Generated audio is persisted to S3 under the user's storage path with a 5 GB default quota. The browser UI receives real-time job status updates via SSE.

## Why Server-Side (Not Browser-Side)

| Concern | Browser-Side | Server-Side (this plan) |
|---|---|---|
| Provider key exposure | Key in browser memory | Key never leaves server |
| CORS restrictions | Blocks some providers | No CORS — Lambda calls APIs directly |
| Non-UI clients | Not possible | curl, Python, CLI, CI/CD all work |
| Unified interface | Each provider different | `POST /v1/synthesize` for all |
| Job tracking | Best-effort client state | Reliable server-side records |
| Background processing | Page must stay open | Lambda runs independently |
| Batch synthesis | Not practical | SQS fan-out, parallel workers |
| Status updates | Polling | SSE stream from API Gateway |

## Architecture

```
                                    ┌─────────────────────┐
                                    │  Clients            │
                                    │  • Browser UI       │
                                    │  • CLI / curl       │
                                    │  • SDK / webhook    │
                                    └──────────┬──────────┘
                                               │
                                    Vokda API Key (header)
                                               │
                                    ┌──────────▼──────────┐
                                    │  API Gateway         │
                                    │  (HTTP API)          │
                                    │                      │
                                    │  Routes:             │
                                    │  POST /v1/synthesize │
                                    │  GET  /v1/jobs       │
                                    │  GET  /v1/jobs/{id}  │
                                    │  DEL  /v1/jobs/{id}  │
                                    │  GET  /v1/media/usage│
                                    │  POST /v1/keys       │
                                    │  GET  /v1/keys       │
                                    │  DEL  /v1/keys/{id}  │
                                    │  GET  /v1/events     │ ← SSE
                                    └──┬───────────────┬───┘
                                       │               │
                        ┌──────────────▼──┐   ┌───────▼────────────┐
                        │  Auth Lambda     │   │  Synthesis Router  │
                        │  (authorizer)    │   │  Lambda            │
                        │                  │   │                    │
                        │  Validate API key│   │  • Quota check     │
                        │  → resolve userId│   │  • Resolve creds   │
                        │  → attach policy │   │  • Short job: sync │
                        └──────────────────┘   │  • Long job: SQS   │
                                               └───────┬──────┬─────┘
                                                       │      │
                                          ┌────────────▼─┐  ┌─▼───────────────┐
                                          │ Sync path    │  │ Async path      │
                                          │ (<15s est.)  │  │ (batch, long)   │
                                          │              │  │                 │
                                          │ Call provider│  │ SQS Queue       │
                                          │ Upload S3    │  │   │             │
                                          │ Return URL   │  │   ▼             │
                                          └──────────────┘  │ Worker Lambda   │
                                                            │   │             │
                                                            │   ├─ Provider   │
                                                            │   ├─ S3 upload  │
                                                            │   ├─ DDB update │
                                                            │   └─ SSE notify │
                                                            └─────────────────┘
                                          Storage:
                                          ┌──────────────────────────────────┐
                                          │  S3: users/{uid}/synth/{id}.mp3 │
                                          │  DDB: SynthesisJob (per job)    │
                                          │  DDB: UserMediaUsage (counter)  │
                                          │  DDB: VokdaApiKey (per user)    │
                                          └──────────────────────────────────┘
```

## Existing Infrastructure

| Component | Status | Reuse |
|---|---|---|
| Cognito user pool (`us-east-1_9hZ6azqx6`) | ✅ Deployed | API key ownership tied to Cognito user |
| S3 bucket (`vokdaAudio`) | ✅ Deployed | `users/{entity_id}/synth/*` path |
| DDB `SynthesisJob` table | ✅ Deployed | Enhance with new fields |
| DDB `UserProviderCredential` table | ✅ Deployed | Lambda reads to get provider keys |
| Amplify AppSync (data API) | ✅ Deployed | UI reads jobs/usage via AppSync |
| SAM CLI | ✅ Installed | Build + deploy Lambda stack |
| AWS account 471112983933 | ✅ Active | Same account as Amplify |

---

## API Design

### Authentication

Every request includes a Vokda API key in the `Authorization` header:

```
Authorization: Bearer vk_live_a1b2c3d4e5f6...
```

Keys are scoped per user. A Lambda authorizer:
1. Looks up the key hash in `VokdaApiKey` DDB table
2. Resolves the `userId` (Cognito sub)
3. Returns an IAM policy allowing access to synthesis routes
4. Attaches `userId` to the request context

### Endpoints

#### `POST /v1/synthesize`

Create a synthesis job. Short jobs return audio synchronously; long jobs return a job ID for polling.

**Request:**
```json
{
  "voiceId": "01JCVK5F2Q2W5P4TQ8KT4NR1A1",
  "text": "Hello, this is a test of voice synthesis.",
  "mode": "text",
  "provider": "openai",
  "options": {
    "model": "tts-1-hd",
    "speed": 1.0,
    "format": "mp3"
  },
  "async": false
}
```

**Response (sync — audio returned inline):**
```json
{
  "jobId": "01JK...",
  "status": "completed",
  "audioUrl": "https://s3.amazonaws.com/.../synth/01JK....mp3",
  "fileSizeBytes": 48320,
  "durationMs": 2400,
  "latencyMs": 820,
  "provider": "openai",
  "voiceId": "01JCVK5F2Q2W5P4TQ8KT4NR1A1",
  "voiceName": "Alloy",
  "createdAt": "2026-03-05T21:00:00Z"
}
```

**Response (async — job queued):**
```json
{
  "jobId": "01JK...",
  "status": "pending",
  "message": "Job queued. Poll GET /v1/jobs/01JK... or subscribe to GET /v1/events for updates."
}
```

#### `GET /v1/jobs`

List user's synthesis jobs (paginated, newest first).

```
GET /v1/jobs?limit=50&cursor=xxx&provider=openai&status=completed
```

**Response:**
```json
{
  "jobs": [ { "jobId": "...", "status": "completed", ... } ],
  "nextCursor": "xxx",
  "totalCount": 142
}
```

#### `GET /v1/jobs/{id}`

Get a single job's status and details.

#### `DELETE /v1/jobs/{id}`

Delete a job and its audio file from S3. Decrements usage counter.

#### `GET /v1/media/usage`

Get current storage usage and quota.

```json
{
  "totalBytes": 2415919104,
  "fileCount": 142,
  "quotaBytes": 5368709120,
  "usagePercent": 45,
  "remainingBytes": 2952790016
}
```

#### `POST /v1/keys`

Create a new Vokda API key.

```json
{
  "label": "My CLI key"
}
```

**Response:**
```json
{
  "id": "key_01JK...",
  "key": "vk_live_a1b2c3d4e5f6...",
  "label": "My CLI key",
  "createdAt": "2026-03-05T21:00:00Z"
}
```

> ⚠️ The full key is only returned once at creation. Store it securely.

#### `GET /v1/keys`

List user's API keys (metadata only, not the key value).

#### `DELETE /v1/keys/{id}`

Revoke an API key.

#### `GET /v1/events`

SSE stream for real-time job status updates.

```
GET /v1/events
Accept: text/event-stream
Authorization: Bearer vk_live_...
```

```
event: job.completed
data: {"jobId":"01JK...","status":"completed","audioUrl":"...","latencyMs":820}

event: job.failed
data: {"jobId":"01JK...","status":"failed","errorMessage":"Provider rate limit exceeded"}

event: usage.updated
data: {"totalBytes":2415919104,"fileCount":143,"quotaBytes":5368709120}
```

---

## Data Models

### VokdaApiKey (new DDB table via SAM)

```
PK: keyHash (SHA-256 of the API key)
userId: string (Cognito sub)
label: string
keyPrefix: string ("vk_live_a1b2") — for display, not auth
status: "active" | "revoked"
lastUsedAt: ISO string
createdAt: ISO string
```

> Keys stored as SHA-256 hashes. The raw key is shown once at creation and never stored.

### SynthesisJob (enhance existing Amplify model)

Add fields to existing table:
```
voiceName: string           # denormalized for API responses
audioUrl: string            # S3 pre-signed or public URL
fileSizeBytes: integer      # actual file size after upload
format: string              # "mp3" | "wav" | "pcm"
model: string               # provider-specific model used
inputCharCount: integer     # for usage analytics
```

### UserMediaUsage (new Amplify model)

```
totalBytes: integer (default 0)
fileCount: integer (default 0)
quotaBytes: integer (default 5368709120)  # 5 GB
lastUpdatedAt: ISO string
```

---

## Lambda Functions

### 1. `auth-authorizer` — API Key Validation

**Runtime:** Node.js 20  
**Timeout:** 5s  
**Memory:** 128 MB  

```
Input: API Gateway event with Authorization header
1. Extract key from "Bearer vk_live_..." header
2. SHA-256 hash the key
3. Look up hash in VokdaApiKey table
4. If not found or status != "active" → 401
5. Update lastUsedAt (fire-and-forget)
6. Return IAM policy + userId in context
```

### 2. `synthesis-router` — Request Handler

**Runtime:** Node.js 20  
**Timeout:** 60s (sync path needs time for provider call + S3 upload)  
**Memory:** 512 MB  

```
Input: API Gateway event with userId from authorizer context

POST /v1/synthesize:
1. Validate request body (voiceId, text, provider required)
2. Check user quota via UserMediaUsage
3. Look up UserProviderCredential for the provider
4. If no credential → 400 "No API key configured for {provider}"
5. Estimate job duration from text length
6. If async=true OR estimated > 15s → queue to SQS, return 202
7. Else: call provider API directly
8. Upload audio to S3: users/{userId}/synth/{jobId}.mp3
9. Create SynthesisJob record
10. Increment UserMediaUsage
11. Return 200 with audio URL

GET /v1/jobs: query SynthesisJob by owner
GET /v1/jobs/{id}: get single job
DELETE /v1/jobs/{id}: delete job + S3 file + decrement usage
GET /v1/media/usage: read UserMediaUsage
POST /v1/keys: create VokdaApiKey
GET /v1/keys: list keys
DELETE /v1/keys/{id}: revoke key
```

### 3. `synthesis-worker` — SQS Consumer

**Runtime:** Node.js 20  
**Timeout:** 300s (5 min for long synthesis)  
**Memory:** 512 MB  
**Trigger:** SQS queue  
**Concurrency:** 10 max per user (via message group ID)  

```
Input: SQS message with synthesis request

1. Decrypt user's provider credential
2. Call provider TTS API
3. Upload audio to S3
4. Update SynthesisJob status → "completed"
5. Increment UserMediaUsage
6. Push SSE event to connections table (for real-time UI)
```

### 4. `events-stream` — SSE Endpoint

**Runtime:** Node.js 20  
**Timeout:** 900s (15 min max API Gateway timeout)  
**Memory:** 128 MB  

Uses API Gateway's response streaming to maintain an SSE connection. Job completion events are pushed via DynamoDB Streams → Lambda trigger → write to active connections.

> **Alternative (simpler for v1):** Skip SSE. UI polls `GET /v1/jobs/{id}` every 2s while a job is pending. Add SSE in v2 when needed.

---

## Provider Adapters (Server-Side)

Each adapter is a function that takes credential data + synthesis params and returns an audio Buffer.

```typescript
// infra/functions/lib/adapters/types.ts
export type SynthesisParams = {
  voiceId: string;
  providerVoiceId: string;
  text: string;
  mode: 'text' | 'ssml';
  format: 'mp3' | 'wav';
  options?: Record<string, unknown>;
};

export type SynthesisResult = {
  audio: Buffer;
  contentType: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

export type ProviderAdapter = {
  id: string;
  synthesize: (
    credential: Record<string, string>,
    params: SynthesisParams
  ) => Promise<SynthesisResult>;
};
```

### Adapters to Build

| Provider | Auth | API | Notes |
|---|---|---|---|
| `openai` | `apiKey` | POST /v1/audio/speech | Returns audio stream |
| `elevenlabs` | `apiKey` (xi-api-key) | POST /v1/text-to-speech/{id} | Returns audio stream |
| `deepgram` | `apiKey` (Token) | POST /v1/speak | Returns audio stream |
| `cartesia` | `apiKey` (X-API-Key) | POST /tts/bytes | Returns audio bytes |
| `lmnt` | `apiKey` (X-API-Key) | POST /v1/ai/speech | FormData, returns audio |
| `azure-speech` | `subscriptionKey`+`region` | POST cognitiveservices/v1 | SSML input, returns audio |
| `gcp-tts` | `apiKey` | POST text:synthesize | Returns base64 audio |
| `gemini-tts` | `apiKey` | POST generateContent | Returns base64 audio in JSON |
| `aws-polly` | `accessKeyId`+`secretAccessKey`+`region` | SynthesizeSpeech | AWS SDK call, returns stream |

> Server-side adapters are simpler than browser-side: no CORS, no blob URLs, just HTTP calls that return Buffers.

---

## SAM Template

```
infra/
├── template.yaml           # SAM template
├── samconfig.toml           # SAM config (stack name, region, params)
├── functions/
│   ├── auth-authorizer/
│   │   └── index.mjs
│   ├── synthesis-router/
│   │   ├── index.mjs
│   │   └── lib/
│   │       ├── adapters/    # Provider adapter implementations
│   │       ├── quota.mjs    # Quota check/update
│   │       ├── jobs.mjs     # SynthesisJob CRUD
│   │       └── keys.mjs     # VokdaApiKey CRUD
│   └── synthesis-worker/
│       ├── index.mjs
│       └── lib/
│           └── adapters/    # Shared adapter code (symlink or layer)
└── layers/
    └── adapters/            # Lambda layer with shared adapter code
```

### SAM Resources

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Vokda Synthesis API

Parameters:
  Stage:
    Type: String
    Default: dev
  CognitoUserPoolId:
    Type: String
  S3BucketName:
    Type: String
  SynthesisJobTableName:
    Type: String
  UserMediaUsageTableName:
    Type: String
  UserProviderCredentialTableName:
    Type: String
  MaxQuotaBytes:
    Type: Number
    Default: 5368709120

Globals:
  Function:
    Runtime: nodejs20.x
    Architectures: [arm64]
    Environment:
      Variables:
        STAGE: !Ref Stage
        S3_BUCKET: !Ref S3BucketName
        SYNTHESIS_JOB_TABLE: !Ref SynthesisJobTableName
        USER_MEDIA_USAGE_TABLE: !Ref UserMediaUsageTableName
        USER_CREDENTIAL_TABLE: !Ref UserProviderCredentialTableName
        MAX_QUOTA_BYTES: !Ref MaxQuotaBytes

Resources:
  # ─── API Gateway ───
  SynthesisApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      StageName: !Ref Stage
      CorsConfiguration:
        AllowOrigins: ["*"]
        AllowMethods: ["GET", "POST", "DELETE", "OPTIONS"]
        AllowHeaders: ["Authorization", "Content-Type"]

  # ─── DynamoDB Tables ───
  VokdaApiKeyTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "VokdaApiKey-${Stage}"
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - { AttributeName: keyHash, AttributeType: S }
        - { AttributeName: userId, AttributeType: S }
      KeySchema:
        - { AttributeName: keyHash, KeyType: HASH }
      GlobalSecondaryIndexes:
        - IndexName: userId-index
          KeySchema:
            - { AttributeName: userId, KeyType: HASH }
          Projection: { ProjectionType: ALL }

  UserMediaUsageTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "UserMediaUsage-${Stage}"
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - { AttributeName: userId, AttributeType: S }
      KeySchema:
        - { AttributeName: userId, KeyType: HASH }

  # ─── SQS Queue ───
  SynthesisQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub "vokda-synthesis-${Stage}"
      VisibilityTimeout: 360
      MessageRetentionPeriod: 86400
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt SynthesisDeadLetterQueue.Arn
        maxReceiveCount: 3

  SynthesisDeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub "vokda-synthesis-dlq-${Stage}"
      MessageRetentionPeriod: 1209600

  # ─── Lambda Functions ───
  AuthAuthorizer:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      CodeUri: functions/auth-authorizer/
      MemorySize: 128
      Timeout: 5
      Environment:
        Variables:
          API_KEY_TABLE: !Ref VokdaApiKeyTable
      Policies:
        - DynamoDBReadPolicy: { TableName: !Ref VokdaApiKeyTable }

  SynthesisRouter:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      CodeUri: functions/synthesis-router/
      MemorySize: 512
      Timeout: 60
      Policies:
        - DynamoDBCrudPolicy: { TableName: !Ref SynthesisJobTableName }
        - DynamoDBCrudPolicy: { TableName: !Ref UserMediaUsageTable }
        - DynamoDBReadPolicy: { TableName: !Ref UserProviderCredentialTableName }
        - DynamoDBCrudPolicy: { TableName: !Ref VokdaApiKeyTable }
        - S3CrudPolicy: { BucketName: !Ref S3BucketName }
        - SQSSendMessagePolicy: { QueueName: !GetAtt SynthesisQueue.QueueName }
      Environment:
        Variables:
          SYNTHESIS_QUEUE_URL: !Ref SynthesisQueue
          API_KEY_TABLE: !Ref VokdaApiKeyTable
          USER_MEDIA_USAGE_TABLE: !Sub "UserMediaUsage-${Stage}"
      Events:
        Synthesize:
          Type: HttpApi
          Properties:
            ApiId: !Ref SynthesisApi
            Path: /v1/synthesize
            Method: POST
        ListJobs:
          Type: HttpApi
          Properties:
            ApiId: !Ref SynthesisApi
            Path: /v1/jobs
            Method: GET
        GetJob:
          Type: HttpApi
          Properties:
            ApiId: !Ref SynthesisApi
            Path: /v1/jobs/{id}
            Method: GET
        DeleteJob:
          Type: HttpApi
          Properties:
            ApiId: !Ref SynthesisApi
            Path: /v1/jobs/{id}
            Method: DELETE
        GetUsage:
          Type: HttpApi
          Properties:
            ApiId: !Ref SynthesisApi
            Path: /v1/media/usage
            Method: GET
        CreateKey:
          Type: HttpApi
          Properties:
            ApiId: !Ref SynthesisApi
            Path: /v1/keys
            Method: POST
        ListKeys:
          Type: HttpApi
          Properties:
            ApiId: !Ref SynthesisApi
            Path: /v1/keys
            Method: GET
        DeleteKey:
          Type: HttpApi
          Properties:
            ApiId: !Ref SynthesisApi
            Path: /v1/keys/{id}
            Method: DELETE

  SynthesisWorker:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      CodeUri: functions/synthesis-worker/
      MemorySize: 512
      Timeout: 300
      Policies:
        - DynamoDBCrudPolicy: { TableName: !Ref SynthesisJobTableName }
        - DynamoDBCrudPolicy: { TableName: !Ref UserMediaUsageTable }
        - DynamoDBReadPolicy: { TableName: !Ref UserProviderCredentialTableName }
        - S3CrudPolicy: { BucketName: !Ref S3BucketName }
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt SynthesisQueue.Arn
            BatchSize: 1

Outputs:
  ApiUrl:
    Value: !Sub "https://${SynthesisApi}.execute-api.${AWS::Region}.amazonaws.com/${Stage}"
  ApiKeyTableName:
    Value: !Ref VokdaApiKeyTable
  UsageTableName:
    Value: !Sub "UserMediaUsage-${Stage}"
  QueueUrl:
    Value: !Ref SynthesisQueue
```

---

## Vokda API Key System

### Key Format

```
vk_live_<32 random alphanumeric chars>
```

Example: `vk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### Key Lifecycle

1. User navigates to `/account/api-keys` (new page)
2. Clicks "Create API Key" → enters label → key generated client-side
3. Full key shown **once** — user copies it
4. SHA-256 hash + metadata stored in `VokdaApiKey` table
5. Key can be revoked (soft delete — status = "revoked")
6. Max 5 active keys per user

### Security

- Raw key never stored — only SHA-256 hash
- Key prefix (`vk_live_a1b2`) stored for display/identification
- DDB table is outside Amplify (SAM-managed) — IAM-only access, no public
- Lambda authorizer validates on every request

---

## Frontend Integration

### New Pages

#### `/account/api-keys`
- Create, list, revoke Vokda API keys
- Show key prefix + label + last used + created date
- Copy-to-clipboard on creation
- Usage: "Use this key to call the Vokda Synthesis API from any client"

#### `/account/media`
- Media library: browse, play, download, delete generated audio
- Storage usage bar at top
- Filter by provider, date range
- Bulk delete

### Voice Detail Page Changes

Replace the mock synthesis form with a real synthesis panel:

```svelte
<SynthesisPanel {voice} />
```

The panel:
1. Checks if user is signed in → if not: "Sign in to synthesize"
2. Checks if user has credential for this voice's provider → if not: "Connect your {provider} key"
3. Shows text input + "Synthesize" button
4. On click: `POST /v1/synthesize` using user's Vokda API key (or Cognito token for browser)
5. Polls `GET /v1/jobs/{id}` for status (v1 polling; v2 SSE)
6. On complete: plays audio from S3 URL
7. Shows metadata card (latency, file size, provider)

### Browser Auth Path

For the browser UI specifically, the existing Cognito auth can be used instead of API keys:

```
Browser → API Gateway → Cognito JWT authorizer → Lambda
```

This avoids requiring users to create an API key just to use the web UI. The Lambda checks:
1. If `Authorization: Bearer vk_live_...` → API key flow
2. If `Authorization: Bearer eyJ...` (JWT) → Cognito flow → resolve userId from token

Both paths converge to the same `userId` for credential lookup and quota enforcement.

---

## Storage Quota

### Defaults

| Tier | Quota | Notes |
|---|---|---|
| Free | 5 GB | ~2,000 short audio clips |
| (Future) Pro | 50 GB | Self-serve upgrade |

### Enforcement

```
Pre-synthesis check:
  estimated = text.length * 20  (bytes, conservative MP3 estimate)
  if usage.totalBytes + estimated > usage.quotaBytes:
    return 400 { error: "quota_exceeded", ... }

Post-upload update:
  atomicIncrement(usage.totalBytes, actualBytes)
  atomicIncrement(usage.fileCount, 1)

Post-delete update:
  atomicDecrement(usage.totalBytes, deletedBytes)
  atomicDecrement(usage.fileCount, 1)
```

DynamoDB atomic counters ensure consistency under concurrent writes.

### S3 Lifecycle

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

A daily reconciliation Lambda (future) can fix counter drift by listing actual S3 objects.

---

## Cost Analysis

| Component | Monthly @ 1K MAU | Monthly @ 10K MAU |
|---|---|---|
| Lambda (synthesis-router, 50 invocations/user) | ~$0.10 | ~$1.00 |
| Lambda (synthesis-worker) | ~$0.05 | ~$0.50 |
| Lambda (auth-authorizer) | ~$0.02 | ~$0.20 |
| API Gateway (HTTP API) | ~$0.05 | ~$0.50 |
| SQS | ~$0.01 | ~$0.05 |
| S3 storage (avg 200 MB/active user × 100) | ~$0.46 | ~$4.60 |
| S3 requests | ~$0.03 | ~$0.25 |
| DDB (VokdaApiKey, UserMediaUsage) | ~$0.02 | ~$0.15 |
| DDB (SynthesisJob reads) | ~$0.01 | ~$0.10 |
| **Provider API costs** | **$0 (BYOK)** | **$0 (BYOK)** |
| **Total Vokda cost** | **~$0.75/mo** | **~$7.35/mo** |

---

## Sequencing

| Phase | What | LOE | Deliverables |
|---|---|---|---|
| **P1** | SAM stack + API key system + sync synthesis | 1 session | `infra/`, auth Lambda, router Lambda, 3 adapters (OpenAI, ElevenLabs, Deepgram) |
| **P2** | Remaining adapters + SQS async path | 1 session | 6 more adapters, worker Lambda, SQS queue |
| **P3** | Frontend: API keys page + synthesis panel | 1 session | `/account/api-keys`, `SynthesisPanel.svelte`, voice detail wiring |
| **P4** | Quota + media library | 1 session | `UserMediaUsage` table, `/account/media`, usage bar |
| **P5** | SSE real-time updates | 1 session | Events endpoint, DDB Streams trigger |

### Phase 1 Deliverables (next session)

```
infra/
├── template.yaml
├── samconfig.toml
├── functions/
│   ├── auth-authorizer/index.mjs
│   └── synthesis-router/
│       ├── index.mjs
│       └── lib/
│           ├── adapters/openai.mjs
│           ├── adapters/elevenlabs.mjs
│           ├── adapters/deepgram.mjs
│           ├── adapters/types.mjs
│           ├── quota.mjs
│           ├── jobs.mjs
│           └── keys.mjs
apps/web/src/routes/account/api-keys/+page.svelte  (basic)
```

Deploy with:
```bash
cd infra && sam build && sam deploy --guided
```

Test with:
```bash
# Create API key (via Cognito JWT for now)
curl -X POST https://api.vokda.iksnae.com/v1/keys \
  -H "Authorization: Bearer $COGNITO_TOKEN" \
  -d '{"label":"test"}'

# Synthesize
curl -X POST https://api.vokda.iksnae.com/v1/synthesize \
  -H "Authorization: Bearer vk_live_..." \
  -d '{"voiceId":"...","text":"Hello","provider":"openai"}'
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Lambda cold starts add latency | First synthesis slow (~2s) | Use provisioned concurrency for router (future); arm64 for faster cold start |
| Provider API timeout exceeds Lambda timeout | Job fails | SQS path for anything > 15s estimated; 5-min timeout on worker |
| API key leaked by user | Unauthorized usage | Rate limit per key (100 req/hour); user can revoke instantly |
| S3 presigned URL expiry | Audio stops playing | Use long expiry (7 days); regenerate on access |
| SQS message replay (at-least-once) | Duplicate synthesis | Idempotency key from jobId; check DDB before processing |
| Counter drift from crashes | Quota inaccurate | Daily reconciliation Lambda; always allow 5% buffer |

---

## Migration from Browser-Side

The existing browser-side adapters (`apps/web/src/lib/synthesis/adapters/*-real.ts`) become **reference implementations** for the server-side Lambda adapters. The code structure is nearly identical — the main difference is:

| Browser-Side | Server-Side |
|---|---|
| `fetch()` → `response.blob()` → `URL.createObjectURL()` | `fetch()` → `response.arrayBuffer()` → `Buffer.from()` → S3 upload |
| Credential from Svelte store | Credential from DynamoDB read |
| Audio plays in `<audio>` element | Audio URL returned in JSON response |

The browser-side adapters remain as **fallback** for offline/local development.
