/**
 * SynthesisJob CRUD.
 *
 * Uses the existing Amplify-managed SynthesisJob DynamoDB table.
 * The table has owner-based auth in AppSync, but we access it
 * directly via IAM from Lambda (bypassing AppSync).
 */

import { randomBytes } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const TABLE = process.env.SYNTHESIS_JOB_TABLE || '';
const BUCKET = process.env.S3_BUCKET || '';

// ─── ULID-like ID generator ───
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function generateJobId() {
  const time = Date.now();
  let timeStr = '';
  let t = time;
  for (let i = 0; i < 10; i++) {
    timeStr = CROCKFORD[t % 32] + timeStr;
    t = Math.floor(t / 32);
  }
  const rand = randomBytes(10);
  let randStr = '';
  for (const b of rand) {
    randStr += CROCKFORD[b % 32];
  }
  return timeStr + randStr;
}

/**
 * Create a SynthesisJob record.
 */
export async function createJob({
  userId,
  voiceId,
  voiceName,
  providerId,
  inputText,
  inputMode = 'text',
  status = 'pending',
  audioPath,
  audioUrl,
  fileSizeBytes,
  durationMs,
  latencyMs,
  errorMessage,
  waveformJson,
}) {
  const id = generateJobId();
  const now = new Date().toISOString();

  const item = {
    id,
    owner: `${userId}::${userId}`, // Amplify owner field format
    voiceId,
    voiceName: voiceName || null,
    providerId,
    inputText,
    inputMode,
    status,
    clipName: null,
    clipDescription: null,
    clipTags: [],
    audioPath: audioPath || null,
    audioUrl: audioUrl || null,
    fileSizeBytes: fileSizeBytes || null,
    durationMs: durationMs || null,
    latencyMs: latencyMs || null,
    errorMessage: errorMessage || null,
    waveformJson: waveformJson || null,
    createdAtIso: now,
    createdAt: now,   // Amplify auto field
    updatedAt: now,   // Amplify auto field
    __typename: 'SynthesisJob',
  };

  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: item,
  }));

  return { ...item, id };
}

/**
 * Update a job's status and fields.
 */
export async function updateJob(id, updates) {
  const expressions = [];
  const names = {};
  const values = {};

  for (const [key, val] of Object.entries(updates)) {
    const attr = `#${key}`;
    const valKey = `:${key}`;
    expressions.push(`${attr} = ${valKey}`);
    names[attr] = key;
    values[valKey] = val;
  }

  names['#updatedAt'] = 'updatedAt';
  values[':updatedAt'] = new Date().toISOString();
  expressions.push('#updatedAt = :updatedAt');

  await ddb.send(new (await import('@aws-sdk/lib-dynamodb')).UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

/**
 * Get a job by ID, verifying ownership.
 */
export async function getJob(userId, jobId) {
  const result = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { id: jobId },
  }));

  if (!result.Item) return null;

  // Verify ownership
  const owner = result.Item.owner || '';
  if (!owner.includes(userId)) return null;

  return result.Item;
}

/**
 * List jobs for a user (scan with owner filter).
 *
 * Note: For production scale, add a GSI on owner.
 * Scan is acceptable for <1000 items per user.
 */
export async function listJobs(userId, { limit = 50, status: filterStatus } = {}) {
  const ownerPrefix = `${userId}::`;
  let filterExpr = 'begins_with(#owner, :ownerPrefix)';
  const exprNames = { '#owner': 'owner' };
  const exprValues = { ':ownerPrefix': ownerPrefix };

  if (filterStatus) {
    filterExpr += ' AND #status = :status';
    exprNames['#status'] = 'status';
    exprValues[':status'] = filterStatus;
  }

  // Paginate through all scan pages (Limit caps scanned items, not filtered results)
  let items = [];
  let lastKey = undefined;
  do {
    const result = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: filterExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // Sort newest first, then apply limit
  items.sort((a, b) => (b.createdAtIso || '').localeCompare(a.createdAtIso || ''));
  return items.slice(0, Math.min(limit, 200));
}

/**
 * Delete a job and optionally its S3 audio file.
 */
export async function deleteJob(userId, jobId) {
  const job = await getJob(userId, jobId);
  if (!job) throw new Error('Job not found');

  // Delete S3 file if exists
  if (job.audioPath) {
    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: job.audioPath,
      }));
    } catch (err) {
      console.warn(`Failed to delete S3 object ${job.audioPath}:`, err.message);
    }
  }

  // Delete DDB record
  await ddb.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id: jobId },
  }));

  return job.fileSizeBytes || 0;
}
