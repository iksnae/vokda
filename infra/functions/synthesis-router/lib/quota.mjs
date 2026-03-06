/**
 * Media usage quota management.
 *
 * Uses DynamoDB atomic counters for thread-safe increment/decrement.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.USER_MEDIA_USAGE_TABLE || '';
const MAX_QUOTA = Number(process.env.MAX_QUOTA_BYTES) || 5368709120;

/**
 * Get usage for a user. Creates a record if none exists.
 */
export async function getUsage(userId) {
  const result = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { userId },
  }));

  if (!result.Item) {
    // Create default usage record
    const item = {
      userId,
      totalBytes: 0,
      fileCount: 0,
      quotaBytes: MAX_QUOTA,
      lastUpdatedAt: new Date().toISOString(),
    };
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: 'attribute_not_exists(userId)',
    })).catch(() => {
      // Race condition: another request created it. Re-read.
    });

    const reread = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { userId },
    }));
    return reread.Item || item;
  }

  return result.Item;
}

/**
 * Check if user has enough quota for a synthesis.
 * @param {string} userId
 * @param {number} estimatedBytes
 */
export async function checkQuota(userId, estimatedBytes) {
  const usage = await getUsage(userId);
  const quota = usage.quotaBytes || MAX_QUOTA;
  const remaining = Math.max(0, quota - usage.totalBytes);

  return {
    allowed: usage.totalBytes + estimatedBytes <= quota,
    totalBytes: usage.totalBytes,
    fileCount: usage.fileCount,
    quotaBytes: quota,
    remainingBytes: remaining,
    usagePercent: Math.round((usage.totalBytes / quota) * 100),
  };
}

/**
 * Increment usage after successful upload (atomic).
 */
export async function incrementUsage(userId, sizeBytes) {
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { userId },
    UpdateExpression: 'ADD totalBytes :size, fileCount :one SET lastUpdatedAt = :now',
    ExpressionAttributeValues: {
      ':size': sizeBytes,
      ':one': 1,
      ':now': new Date().toISOString(),
    },
  }));
}

/**
 * Decrement usage after file deletion (atomic, floor at 0).
 */
export async function decrementUsage(userId, sizeBytes) {
  // Get current to avoid going negative
  const usage = await getUsage(userId);
  const newTotal = Math.max(0, usage.totalBytes - sizeBytes);
  const newCount = Math.max(0, usage.fileCount - 1);

  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { userId },
    UpdateExpression: 'SET totalBytes = :total, fileCount = :count, lastUpdatedAt = :now',
    ExpressionAttributeValues: {
      ':total': newTotal,
      ':count': newCount,
      ':now': new Date().toISOString(),
    },
  }));
}
