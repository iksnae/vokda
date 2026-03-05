import { createServer } from 'node:http';

const port = Number(process.env.PORT || 8787);
const corsOrigin = process.env.VOKDA_API_CORS_ORIGIN || '*';
const authMode = process.env.VOKDA_AUTH_MODE || 'mock';

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

function assertAuth(req) {
  if (authMode === 'none') return { id: 'anonymous', roles: ['visitor'] };

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Missing bearer token');
  }

  const token = authHeader.slice(7);

  if (authMode === 'mock') {
    const role = token.includes('admin') ? 'admin' : token.includes('curator') ? 'curator' : 'guest';
    return { id: `mock-${role}`, roles: [role] };
  }

  // Placeholder for real JWT verification (Cognito JWK validation)
  return { id: 'external-user', roles: ['guest'] };
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
      const user = assertAuth(req);
      sendJson(res, 200, { user });
      return;
    }

    if (req.url === '/v1/synthesize/preview' && req.method === 'POST') {
      const user = assertAuth(req);
      const body = await parseBody(req);
      validatePreviewRequest(body);

      const preview = synthesizePreview(body);
      sendJson(res, 200, {
        ...preview,
        warnings: [...preview.warnings, `Served for role: ${user.roles[0]}`]
      });
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
