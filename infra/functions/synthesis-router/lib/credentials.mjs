/**
 * Credential CRUD operations for the Synthesis API.
 *
 * Reads/writes to the Amplify-managed UserProviderCredential DynamoDB table.
 * Uses the same owner format ({sub}::{sub}) for interop with the web UI.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.USER_CREDENTIAL_TABLE || '';

// ─── Supported providers and their auth shapes ─────────────────────────────

const PROVIDER_AUTH = {
  openai:        { authType: 'api_key', required: ['apiKey'] },
  elevenlabs:    { authType: 'api_key', required: ['apiKey'] },
  deepgram:      { authType: 'api_key', required: ['apiKey'] },
  cartesia:      { authType: 'api_key', required: ['apiKey'] },
  lmnt:          { authType: 'api_key', required: ['apiKey'] },
  'gcp-tts':     { authType: 'api_key', required: ['apiKey'] },
  'gemini-tts':  { authType: 'api_key', required: ['apiKey'] },
  'azure-speech': { authType: 'subscription_key', required: ['subscriptionKey', 'region'] },
  'aws-polly':   { authType: 'aws_credentials', required: ['accessKeyId', 'secretAccessKey'] },
};

// ─── Create / Update ────────────────────────────────────────────────────────

export async function saveCredential(userId, providerId, credentialData, label) {
  // Validate provider
  const schema = PROVIDER_AUTH[providerId];
  if (!schema) {
    const err = new Error(`Unsupported provider: ${providerId}`);
    err.statusCode = 400;
    err.supported = Object.keys(PROVIDER_AUTH);
    throw err;
  }

  // Validate required fields
  for (const field of schema.required) {
    if (!credentialData[field] || typeof credentialData[field] !== 'string' || !credentialData[field].trim()) {
      const err = new Error(`Missing required field: ${field}`);
      err.statusCode = 400;
      throw err;
    }
  }

  // Check for existing credential for this provider (upsert)
  const existing = await findCredential(userId, providerId);
  const now = new Date().toISOString();
  const id = existing?.id || randomUUID();

  const item = {
    id,
    // Amplify owner format
    owner: `${userId}::${userId}`,
    providerId,
    label: label || providerDisplayName(providerId),
    credentialData: JSON.stringify(credentialData),
    status: 'active',
    lastTestedAtIso: null,
    createdAtIso: existing?.createdAtIso || now,
    updatedAtIso: now,
    // Amplify interop fields
    __typename: 'UserProviderCredential',
    _version: 1,
    _lastChangedAt: Date.now(),
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

  return {
    providerId,
    label: item.label,
    authType: schema.authType,
    status: 'active',
    createdAt: item.createdAtIso,
    updatedAt: item.updatedAtIso,
  };
}

// ─── List ───────────────────────────────────────────────────────────────────

export async function listCredentials(userId) {
  const items = await scanUserCredentials(userId);

  return items.map((item) => {
    const schema = PROVIDER_AUTH[item.providerId] || {};
    let maskedKey = null;

    try {
      const data = JSON.parse(item.credentialData);
      // Mask the primary secret field
      const primaryKey = data.apiKey || data.subscriptionKey || data.accessKeyId || data.secretAccessKey;
      if (primaryKey && primaryKey.length > 8) {
        maskedKey = primaryKey.slice(0, 4) + '…' + primaryKey.slice(-4);
      } else if (primaryKey) {
        maskedKey = '••••';
      }
    } catch {
      // ignore parse errors
    }

    return {
      providerId: item.providerId,
      label: item.label || providerDisplayName(item.providerId),
      authType: schema.authType || 'unknown',
      status: item.status || 'active',
      maskedKey,
      createdAt: item.createdAtIso,
      updatedAt: item.updatedAtIso,
      lastTestedAt: item.lastTestedAtIso || null,
    };
  });
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteCredential(userId, providerId) {
  const existing = await findCredential(userId, providerId);
  if (!existing) {
    const err = new Error(`No credential found for provider: ${providerId}`);
    err.statusCode = 404;
    throw err;
  }

  await ddb.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id: existing.id },
  }));

  return { deleted: true, providerId };
}

// ─── Test (dry-run) ─────────────────────────────────────────────────────────

/**
 * Test a credential without storing it. Returns { success, latencyMs, error }.
 * The caller provides the adapter map so we can do a real synthesis test.
 */
export async function testCredential(providerId, credentialData, adapters) {
  const schema = PROVIDER_AUTH[providerId];
  if (!schema) {
    return { success: false, error: `Unsupported provider: ${providerId}` };
  }

  const adapter = adapters[providerId];
  if (!adapter) {
    return { success: false, error: `No synthesis adapter for: ${providerId}` };
  }

  const start = Date.now();
  try {
    await adapter.synthesize(credentialData, {
      text: 'Test.',
      providerVoiceId: getTestVoiceId(providerId),
      mode: 'text',
    });
    return { success: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: err.message,
    };
  }
}

// ─── Internals ──────────────────────────────────────────────────────────────

async function findCredential(userId, providerId) {
  const items = await scanUserCredentials(userId);
  return items.find((i) => i.providerId === providerId) || null;
}

async function scanUserCredentials(userId) {
  let items = [];
  let lastKey;

  do {
    const result = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'begins_with(#owner, :ownerPrefix)',
      ExpressionAttributeNames: { '#owner': 'owner' },
      ExpressionAttributeValues: { ':ownerPrefix': `${userId}::` },
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

function providerDisplayName(providerId) {
  const names = {
    openai: 'OpenAI', elevenlabs: 'ElevenLabs', deepgram: 'Deepgram',
    cartesia: 'Cartesia', lmnt: 'LMNT', 'gcp-tts': 'Google Cloud TTS',
    'gemini-tts': 'Gemini TTS', 'azure-speech': 'Azure Speech',
    'aws-polly': 'AWS Polly',
  };
  return names[providerId] || providerId;
}

function getTestVoiceId(providerId) {
  // Minimal voice ID for a quick test synthesis
  const defaults = {
    openai: 'alloy', elevenlabs: 'Rachel', deepgram: 'aura-2-athena-en',
    cartesia: 'c7c790c5-2bf4-47e4-bc83-5f43e61f3803', lmnt: 'lily',
    'gcp-tts': 'en-US-Wavenet-D', 'gemini-tts': 'Kore',
    'azure-speech': 'en-US-JennyNeural', 'aws-polly': 'Joanna',
  };
  return defaults[providerId] || 'default';
}
