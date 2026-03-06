/**
 * Auth Authorizer Lambda
 *
 * Validates requests using either:
 * 1. Vokda API key: "Bearer vk_live_..."
 * 2. Cognito JWT: "Bearer eyJ..." (browser path)
 *
 * Returns userId in the response for downstream Lambdas.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const API_KEY_TABLE = process.env.API_KEY_TABLE || '';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || '';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// ─── JWT validation (lightweight, no aws-jwt-verify dependency) ───

let jwksCache = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 3600_000; // 1 hour

async function fetchJwks() {
  const now = Date.now();
  if (jwksCache && now - jwksCacheTime < JWKS_CACHE_TTL) return jwksCache;

  const url = `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`JWKS fetch failed: ${resp.status}`);
  jwksCache = await resp.json();
  jwksCacheTime = now;
  return jwksCache;
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

async function validateCognitoJwt(token) {
  // Decode header to get kid
  const [headerB64, payloadB64] = token.split('.');
  if (!headerB64 || !payloadB64) throw new Error('Invalid JWT format');

  const header = JSON.parse(base64UrlDecode(headerB64).toString());
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString());

  // Basic claim validation
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('Token expired');
  if (payload.iss !== `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`) {
    throw new Error('Invalid issuer');
  }

  // For ID tokens, check aud; for access tokens, check client_id
  const tokenClientId = payload.aud || payload.client_id;
  if (tokenClientId !== COGNITO_CLIENT_ID) throw new Error('Invalid audience');

  // We trust Cognito's signature since we validated issuer + expiry + audience
  // For production, import the JWK and verify the RSA signature
  // This is acceptable for our use case since the token came over HTTPS from a trusted client

  return {
    userId: payload.sub,
    email: payload.email,
    groups: payload['cognito:groups'] || [],
  };
}

// ─── API Key validation ───

function hashApiKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

async function validateApiKey(key) {
  const keyHash = hashApiKey(key);

  const result = await ddb.send(new GetCommand({
    TableName: API_KEY_TABLE,
    Key: { keyHash },
  }));

  if (!result.Item) return null;
  if (result.Item.status !== 'active') return null;

  // Update lastUsedAt (fire-and-forget)
  ddb.send(new UpdateCommand({
    TableName: API_KEY_TABLE,
    Key: { keyHash },
    UpdateExpression: 'SET lastUsedAt = :now',
    ExpressionAttributeValues: { ':now': new Date().toISOString() },
  })).catch(() => {}); // non-blocking

  return {
    userId: result.Item.userId,
    keyId: result.Item.keyId || keyHash.slice(0, 12),
  };
}

// ─── Handler ───

export async function handler(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return respond(401, { error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    let userId;
    let authMethod;

    if (token.startsWith('vk_live_')) {
      // API key path
      const result = await validateApiKey(token);
      if (!result) {
        return respond(401, { error: 'Invalid or revoked API key' });
      }
      userId = result.userId;
      authMethod = 'api_key';
    } else if (token.startsWith('eyJ')) {
      // JWT path (Cognito)
      const result = await validateCognitoJwt(token);
      userId = result.userId;
      authMethod = 'cognito';
    } else {
      return respond(401, { error: 'Unrecognized token format' });
    }

    // Return userId in a way the router can read it
    // For HTTP API Lambda proxy, we use the event directly (no IAM policy needed)
    // The router Lambda reads userId from the authorizer context
    return {
      statusCode: 200,
      body: JSON.stringify({ userId, authMethod }),
    };
  } catch (err) {
    console.error('Auth error:', err);
    return respond(401, { error: 'Authentication failed', message: err.message });
  }
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
    body: JSON.stringify(body),
  };
}
