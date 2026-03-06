/**
 * Vokda API Key management.
 */

import { randomBytes, createHash } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.API_KEY_TABLE || '';

function generateApiKey() {
  const raw = randomBytes(24).toString('base64url');
  return `vk_live_${raw}`;
}

function hashKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

export async function createApiKey(userId, label) {
  const key = generateApiKey();
  const keyHash = hashKey(key);
  const keyPrefix = key.slice(0, 16);
  const now = new Date().toISOString();

  // Check active key count
  const existing = await listApiKeys(userId);
  const activeCount = existing.filter(k => k.status === 'active').length;
  if (activeCount >= 5) {
    throw new Error('Maximum 5 active API keys per account');
  }

  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      keyHash,
      userId,
      keyId: keyHash.slice(0, 12),
      keyPrefix,
      label: label || 'Unnamed key',
      status: 'active',
      createdAt: now,
      lastUsedAt: null,
    },
  }));

  return {
    id: keyHash.slice(0, 12),
    key, // returned ONLY on creation
    keyPrefix,
    label: label || 'Unnamed key',
    createdAt: now,
  };
}

export async function listApiKeys(userId) {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }));

  return (result.Items || []).map(item => ({
    id: item.keyId || item.keyHash?.slice(0, 12),
    keyPrefix: item.keyPrefix,
    label: item.label,
    status: item.status,
    createdAt: item.createdAt,
    lastUsedAt: item.lastUsedAt,
  }));
}

export async function revokeApiKey(userId, keyId) {
  // Find the key by keyId in the userId index
  const keys = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }));

  const target = (keys.Items || []).find(
    item => (item.keyId || item.keyHash?.slice(0, 12)) === keyId
  );

  if (!target) throw new Error('API key not found');

  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { keyHash: target.keyHash },
    UpdateExpression: 'SET #s = :revoked',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':revoked': 'revoked' },
    ConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: {
      ':revoked': 'revoked',
      ':uid': userId,
    },
  }));
}
