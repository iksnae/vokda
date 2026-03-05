import { createServer } from 'node:http';
import {
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const port = Number(process.env.PORT || 8787);
const corsOrigin = process.env.VOKDA_API_CORS_ORIGIN || '*';
const authMode = process.env.VOKDA_AUTH_MODE || 'mock';

const managedGroups = ['guest', 'curator', 'admin'];

const cognitoRegion = process.env.VOKDA_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
const cognitoUserPoolId = process.env.VOKDA_COGNITO_USER_POOL_ID || '';
const cognitoClientId = process.env.VOKDA_COGNITO_CLIENT_ID || '';
const cognitoTargetUserPoolId = process.env.VOKDA_COGNITO_TARGET_USER_POOL_ID || cognitoUserPoolId;

const cognitoClient = cognitoTargetUserPoolId
  ? new CognitoIdentityProviderClient({ region: cognitoRegion })
  : null;

const cognitoVerifier =
  authMode === 'cognito' && cognitoUserPoolId && cognitoClientId
    ? CognitoJwtVerifier.create({
        userPoolId: cognitoUserPoolId,
        tokenUse: 'access',
        clientId: cognitoClientId
      })
    : null;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': corsOrigin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function parseBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Missing bearer token');
  }
  return authHeader.slice(7);
}

function groupsToRoles(groups) {
  const normalized = Array.isArray(groups) ? groups.map(String) : [];
  const roles = ['guest'];
  if (normalized.includes('curator')) roles.push('curator');
  if (normalized.includes('admin')) roles.push('admin');
  return Array.from(new Set(roles));
}

async function assertAuth(req) {
  if (authMode === 'none') return { id: 'anonymous', roles: ['visitor'] };

  const token = parseBearerToken(req);

  if (authMode === 'mock') {
    const role = token.includes('admin') ? 'admin' : token.includes('curator') ? 'curator' : 'guest';
    return { id: `mock-${role}`, roles: [role] };
  }

  if (authMode !== 'cognito') {
    throw new Error(`Unsupported auth mode: ${authMode}`);
  }

  if (!cognitoVerifier) {
    throw new Error('Cognito verifier is not configured. Set VOKDA_COGNITO_USER_POOL_ID and VOKDA_COGNITO_CLIENT_ID.');
  }

  const claims = await cognitoVerifier.verify(token);
  const groups = claims['cognito:groups'];

  return {
    id: String(claims.sub || claims.username || 'unknown-user'),
    roles: groupsToRoles(groups),
    email: typeof claims.email === 'string' ? claims.email : undefined,
    username: typeof claims.username === 'string' ? claims.username : undefined
  };
}

async function assertAdmin(req) {
  const user = await assertAuth(req);
  if (!user.roles.includes('admin')) {
    throw new Error('Admin role required');
  }
  return user;
}

function validatePreviewRequest(body) {
  const required = ['sourceKey', 'variantId', 'input', 'mode'];
  for (const key of required) {
    if (!(key in body)) {
      throw new Error(`Missing required field: ${key}`);
    }
  }

  if (typeof body.sourceKey !== 'string' || !body.sourceKey.trim()) {
    throw new Error('sourceKey must be a non-empty string');
  }

  if (typeof body.variantId !== 'string' || !body.variantId.trim()) {
    throw new Error('variantId must be a non-empty string');
  }

  if (typeof body.input !== 'string' || !body.input.trim()) {
    throw new Error('input must be a non-empty string');
  }

  if (body.mode !== 'text' && body.mode !== 'ssml') {
    throw new Error('mode must be one of: text, ssml');
  }
}

function adapterFromSourceKey(sourceKey) {
  if (sourceKey.startsWith('aws:polly:')) return 'aws-polly';
  if (sourceKey.startsWith('azure:speech:')) return 'azure-speech';
  if (sourceKey.startsWith('gcp:tts:')) return 'gcp-tts';
  if (sourceKey.startsWith('elevenlabs:tts:')) return 'elevenlabs';
  if (sourceKey.startsWith('hf:')) return 'huggingface';
  if (sourceKey.startsWith('self:')) return 'self-hosted';
  return 'unknown';
}

function synthesizePreview(body) {
  const adapter = adapterFromSourceKey(body.sourceKey);
  const latencyMs = 120 + Math.floor(Math.random() * 280);

  return {
    provider: 'gateway',
    adapter,
    variantId: body.variantId,
    sourceKey: body.sourceKey,
    inputUsed: body.input,
    warnings: adapter === 'unknown' ? ['Unknown adapter for provided sourceKey.'] : [],
    latencyMs,
    generatedAt: new Date().toISOString()
  };
}

function getUserAttribute(user, name) {
  const attrs = user.Attributes || [];
  return attrs.find((item) => item.Name === name)?.Value;
}

async function findUserByEmail(email) {
  if (!cognitoClient || !cognitoTargetUserPoolId) {
    throw new Error('Cognito admin operations are not configured. Set VOKDA_COGNITO_TARGET_USER_POOL_ID.');
  }

  const response = await cognitoClient.send(
    new ListUsersCommand({
      UserPoolId: cognitoTargetUserPoolId,
      Filter: `email = \"${email.replace(/\"/g, '')}\"`,
      Limit: 5
    })
  );

  const users = response.Users || [];
  const exact = users.find((user) => getUserAttribute(user, 'email')?.toLowerCase() === email.toLowerCase());
  return exact || null;
}

async function listGroupsForUsername(username) {
  if (!cognitoClient || !cognitoTargetUserPoolId) {
    throw new Error('Cognito admin operations are not configured. Set VOKDA_COGNITO_TARGET_USER_POOL_ID.');
  }

  const response = await cognitoClient.send(
    new AdminListGroupsForUserCommand({
      UserPoolId: cognitoTargetUserPoolId,
      Username: username
    })
  );

  return (response.Groups || []).map((entry) => entry.GroupName).filter(Boolean);
}

async function setManagedGroupsForUser(username, desiredGroups) {
  if (!cognitoClient || !cognitoTargetUserPoolId) {
    throw new Error('Cognito admin operations are not configured. Set VOKDA_COGNITO_TARGET_USER_POOL_ID.');
  }

  const current = await listGroupsForUsername(username);
  const currentManaged = current.filter((group) => managedGroups.includes(group));

  const toAdd = desiredGroups.filter((group) => !currentManaged.includes(group));
  const toRemove = currentManaged.filter((group) => !desiredGroups.includes(group));

  await Promise.all([
    ...toAdd.map((groupName) =>
      cognitoClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: cognitoTargetUserPoolId,
          Username: username,
          GroupName: groupName
        })
      )
    ),
    ...toRemove.map((groupName) =>
      cognitoClient.send(
        new AdminRemoveUserFromGroupCommand({
          UserPoolId: cognitoTargetUserPoolId,
          Username: username,
          GroupName: groupName
        })
      )
    )
  ]);
}

function normalizeDesiredGroups(roles) {
  if (!Array.isArray(roles)) {
    throw new Error('roles must be an array');
  }

  const normalized = Array.from(new Set(roles.map((role) => String(role).trim()).filter(Boolean)));

  const invalid = normalized.filter((role) => !managedGroups.includes(role));
  if (invalid.length) {
    throw new Error(`Invalid roles: ${invalid.join(', ')}`);
  }

  if (normalized.includes('admin')) {
    return ['guest', 'curator', 'admin'];
  }

  if (normalized.includes('curator')) {
    return ['guest', 'curator'];
  }

  return ['guest'];
}

function mapUserResult(user, groups) {
  return {
    username: user.Username,
    email: getUserAttribute(user, 'email') || null,
    enabled: Boolean(user.Enabled),
    status: user.UserStatus || null,
    groups: groups.filter((group) => managedGroups.includes(group)),
    roles: groupsToRoles(groups)
  };
}

async function handleAdminUserLookup(req, res) {
  await assertAdmin(req);

  const requestUrl = new URL(req.url, `http://127.0.0.1:${port}`);
  const email = requestUrl.searchParams.get('email')?.trim().toLowerCase();

  if (!email) {
    sendJson(res, 400, { error: 'Query parameter email is required' });
    return;
  }

  const user = await findUserByEmail(email);
  if (!user || !user.Username) {
    sendJson(res, 404, { error: 'User not found' });
    return;
  }

  const groups = await listGroupsForUsername(user.Username);
  sendJson(res, 200, {
    user: mapUserResult(user, groups)
  });
}

async function handleAdminUserRolesUpdate(req, res) {
  await assertAdmin(req);

  const body = await parseBody(req);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email) {
    sendJson(res, 400, { error: 'email is required' });
    return;
  }

  const desiredGroups = normalizeDesiredGroups(body.roles);
  const user = await findUserByEmail(email);

  if (!user || !user.Username) {
    sendJson(res, 404, { error: 'User not found' });
    return;
  }

  await setManagedGroupsForUser(user.Username, desiredGroups);
  const refreshedGroups = await listGroupsForUsername(user.Username);

  sendJson(res, 200, {
    ok: true,
    user: mapUserResult(user, refreshedGroups)
  });
}

const server = createServer(async (req, res) => {
  if (!req.url || !req.method) {
    sendJson(res, 400, { error: 'Invalid request' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': corsOrigin,
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization'
    });
    res.end();
    return;
  }

  try {
    if (req.url === '/health' && req.method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        service: 'vokda-api',
        authMode,
        now: new Date().toISOString()
      });
      return;
    }

    if (req.url === '/v1/auth/session' && req.method === 'GET') {
      const user = await assertAuth(req);
      sendJson(res, 200, { user });
      return;
    }

    if (req.url === '/v1/synthesize/preview' && req.method === 'POST') {
      const user = await assertAuth(req);
      const body = await parseBody(req);
      validatePreviewRequest(body);

      const preview = synthesizePreview(body);
      sendJson(res, 200, {
        ...preview,
        warnings: [...preview.warnings, `Served for role: ${user.roles[0]}`]
      });
      return;
    }

    if (req.url.startsWith('/v1/admin/users') && req.method === 'GET') {
      await handleAdminUserLookup(req, res);
      return;
    }

    if (req.url === '/v1/admin/users/roles' && req.method === 'POST') {
      await handleAdminUserRolesUpdate(req, res);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : 'Unexpected API error'
    });
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`vokda-api listening on http://127.0.0.1:${port}`);
});
