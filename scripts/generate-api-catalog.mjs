#!/usr/bin/env node
/**
 * Generate static API catalog files from voices.json.
 *
 * Outputs:
 *   static/api/v1/voices.json       — full catalog
 *   static/api/v1/voices/{id}.json  — individual voice detail
 *   static/api/v1/providers.json    — provider directory with enriched metadata
 *   static/api/v1/stats.json        — catalog statistics
 *   static/api/v1/openapi.json      — OpenAPI 3.1 spec (catalog + synthesis)
 *
 * Run: node scripts/generate-api-catalog.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const VOICES_PATH = join(ROOT, 'apps/web/static/data/voices.json');
const OUT_DIR = join(ROOT, 'apps/web/static/api/v1');

// ─── Load ────────────────────────────────────────────────────────────────────

const catalog = JSON.parse(readFileSync(VOICES_PATH, 'utf8'));
const voices = catalog.voices;
const now = new Date().toISOString();

console.log(`Loaded ${voices.length} voices`);

// ─── Provider enrichment ─────────────────────────────────────────────────────

const PROVIDER_META = {
  openai: {
    type: 'cloud', synthesis: true, ssml: false,
    description: 'High-quality voices via GPT-4o audio models. Near-human naturalness.',
    websiteUrl: 'https://openai.com',
    docsUrl: 'https://platform.openai.com/docs/guides/text-to-speech',
    signupUrl: 'https://platform.openai.com/signup',
    pricingUrl: 'https://openai.com/api/pricing/',
    pricingSummary: '$15/1M chars (tts-1), $30/1M chars (tts-1-hd)',
    freeTier: null,
    authType: 'api_key',
  },
  elevenlabs: {
    type: 'cloud', synthesis: true, ssml: false,
    description: 'Industry-leading voice cloning and synthesis with emotion control.',
    websiteUrl: 'https://elevenlabs.io',
    docsUrl: 'https://docs.elevenlabs.io/api-reference/text-to-speech',
    signupUrl: 'https://elevenlabs.io',
    pricingUrl: 'https://elevenlabs.io/pricing',
    pricingSummary: 'Free: 10K chars/mo. Creator $22/mo, Pro $99/mo',
    freeTier: '10,000 characters/month',
    authType: 'api_key',
  },
  deepgram: {
    type: 'cloud', synthesis: true, ssml: false,
    description: 'Aura TTS with 100+ voices. Strong multilingual support.',
    websiteUrl: 'https://deepgram.com',
    docsUrl: 'https://developers.deepgram.com/docs/tts-rest',
    signupUrl: 'https://console.deepgram.com/signup',
    pricingUrl: 'https://deepgram.com/pricing',
    pricingSummary: 'Free: $200 credit. Then pay-per-use',
    freeTier: '$200 credit',
    authType: 'api_key',
  },
  cartesia: {
    type: 'cloud', synthesis: true, ssml: false,
    description: 'Ultra-low latency synthesis for real-time applications.',
    websiteUrl: 'https://cartesia.ai',
    docsUrl: 'https://docs.cartesia.ai',
    signupUrl: 'https://cartesia.ai',
    pricingUrl: 'https://cartesia.ai/pricing',
    pricingSummary: 'Free tier available. Pay-per-use at scale',
    freeTier: 'Limited free credits',
    authType: 'api_key',
  },
  lmnt: {
    type: 'cloud', synthesis: true, ssml: false,
    description: 'Fast, expressive TTS with voice cloning.',
    websiteUrl: 'https://lmnt.com',
    docsUrl: 'https://docs.lmnt.com',
    signupUrl: 'https://lmnt.com',
    pricingUrl: 'https://lmnt.com/pricing',
    pricingSummary: 'Free tier available. Usage-based pricing',
    freeTier: 'Free tier available',
    authType: 'api_key',
  },
  'gemini-tts': {
    type: 'cloud', synthesis: true, ssml: false,
    description: "Google's Gemini TTS with high naturalness and multilingual support.",
    websiteUrl: 'https://ai.google.dev',
    docsUrl: 'https://ai.google.dev/gemini-api/docs/text-generation',
    signupUrl: 'https://aistudio.google.com/apikey',
    pricingUrl: 'https://ai.google.dev/pricing',
    pricingSummary: 'Free: 10 req/min. Paid plans for higher throughput',
    freeTier: '10 requests/minute',
    authType: 'api_key',
  },
  'gcp-tts': {
    type: 'cloud', synthesis: true, ssml: true,
    description: 'Enterprise-grade TTS with WaveNet/Neural2 voices and full SSML.',
    websiteUrl: 'https://cloud.google.com/text-to-speech',
    docsUrl: 'https://cloud.google.com/text-to-speech/docs',
    signupUrl: 'https://console.cloud.google.com/apis/credentials',
    pricingUrl: 'https://cloud.google.com/text-to-speech/pricing',
    pricingSummary: 'Free: 4M chars/mo (standard). Then $4-$16/1M',
    freeTier: '4M characters/month (standard voices)',
    authType: 'api_key',
  },
  'azure-speech': {
    type: 'cloud', synthesis: true, ssml: true,
    description: 'Microsoft cognitive speech with extensive SSML and 140+ languages.',
    websiteUrl: 'https://azure.microsoft.com/products/ai-services/ai-speech',
    docsUrl: 'https://learn.microsoft.com/azure/ai-services/speech-service/',
    signupUrl: 'https://portal.azure.com',
    pricingUrl: 'https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/',
    pricingSummary: 'Free: 500K chars/mo. Standard: $16/1M chars',
    freeTier: '500,000 characters/month',
    authType: 'subscription_key',
  },
  'aws-polly': {
    type: 'cloud', synthesis: true, ssml: true,
    description: "Amazon's TTS with neural and standard engines, full SSML support.",
    websiteUrl: 'https://aws.amazon.com/polly/',
    docsUrl: 'https://docs.aws.amazon.com/polly/',
    signupUrl: 'https://console.aws.amazon.com/iam/',
    pricingUrl: 'https://aws.amazon.com/polly/pricing/',
    pricingSummary: 'Free: 5M chars/mo (12 months). Then $4-$16/1M',
    freeTier: '5M characters/month for 12 months',
    authType: 'aws_credentials',
  },
  'edge-tts': {
    type: 'free', synthesis: false, ssml: true,
    description: "Microsoft Edge's free neural TTS. No API key required.",
    websiteUrl: 'https://github.com/rany2/edge-tts',
    docsUrl: 'https://github.com/rany2/edge-tts',
    signupUrl: null,
    pricingUrl: null,
    pricingSummary: 'Free — no API key, no account, no limits',
    freeTier: 'Unlimited (free)',
    authType: 'none',
  },
  kokoro: {
    type: 'local', synthesis: false, ssml: false,
    description: 'High-quality open-source TTS (82M params). Runs locally via mlx-audio.',
    websiteUrl: 'https://huggingface.co/hexgrad/Kokoro-82M',
    docsUrl: 'https://huggingface.co/hexgrad/Kokoro-82M',
    signupUrl: null,
    pricingUrl: null,
    pricingSummary: 'Free — runs on your own hardware',
    freeTier: 'Free (local)',
    authType: 'none',
  },
};

// ─── Generate providers.json ─────────────────────────────────────────────────

function generateProviders() {
  const providerMap = {};

  for (const v of voices) {
    const pid = v.providerId || '?';
    if (!providerMap[pid]) {
      providerMap[pid] = {
        id: pid,
        name: v.provider,
        voiceCount: 0,
        languages: new Set(),
        qualityTiers: new Set(),
        genders: new Set(),
        ssmlCapable: false,
        hasAudio: 0,
      };
    }
    const p = providerMap[pid];
    p.voiceCount++;
    for (const l of (v.languages || [])) p.languages.add(l);
    if (v.qualityTier) p.qualityTiers.add(v.qualityTier);
    if (v.gender || v.metadata?.genderPresentation) p.genders.add(v.gender || v.metadata?.genderPresentation);
    for (const vr of (v.variants || [])) {
      if (vr.supportsSsml) p.ssmlCapable = true;
    }
    if (v.samples?.some(s => s.audioUrl)) p.hasAudio++;
  }

  const providers = Object.values(providerMap)
    .sort((a, b) => b.voiceCount - a.voiceCount)
    .map(p => {
      const meta = PROVIDER_META[p.id] || {};
      const mc = voices.find(v => v.providerId === p.id)?.modelCard || {};

      return {
        id: p.id,
        name: p.name,
        type: meta.type || (mc.providerType === 'local_mlx' ? 'local' : 'cloud'),
        description: meta.description || null,
        voiceCount: p.voiceCount,
        languages: [...p.languages].sort(),
        languageCount: p.languages.size,
        qualityTiers: [...p.qualityTiers].sort(),
        genders: [...p.genders].filter(Boolean).sort(),
        ssmlCapable: p.ssmlCapable,
        audioSampleCoverage: p.hasAudio === p.voiceCount ? '100%' : `${Math.round(p.hasAudio / p.voiceCount * 100)}%`,

        // Synthesis
        hasSynthesis: meta.synthesis ?? false,
        authType: meta.authType || 'none',

        // Links
        websiteUrl: meta.websiteUrl || mc.providerUrl || null,
        docsUrl: meta.docsUrl || null,
        signupUrl: meta.signupUrl || null,
        pricingUrl: meta.pricingUrl || null,

        // Pricing
        pricingSummary: meta.pricingSummary || null,
        freeTier: meta.freeTier || null,

        // License
        license: mc.license || null,
        commercialUse: mc.commercialUse ?? null,
      };
    });

  return { total: providers.length, generatedAt: now, providers };
}

// ─── Generate stats.json ─────────────────────────────────────────────────────

function generateStats() {
  const providers = new Set();
  const languages = new Set();
  let withAudio = 0, withImage = 0, withModelCard = 0;
  let ssmlSupport = 0, localModels = 0, multilingual = 0;
  const byProvider = {};
  const byQuality = { premium: 0, standard: 0, basic: 0 };

  for (const v of voices) {
    const pid = v.providerId || v.provider;
    providers.add(pid);
    for (const l of (v.languages || [])) languages.add(l);
    if (v.samples?.some(s => s.audioUrl)) withAudio++;
    if (v.imageUrl) withImage++;
    if (v.modelCard) withModelCard++;
    if (v.qualityTier) byQuality[v.qualityTier] = (byQuality[v.qualityTier] || 0) + 1;
    byProvider[pid] = byProvider[pid] || { id: pid, name: v.provider, count: 0 };
    byProvider[pid].count++;
    for (const vr of (v.variants || [])) {
      if (vr.supportsSsml) { ssmlSupport++; break; }
    }
    if (v.modelCard?.providerType === 'local_mlx') localModels++;
    if ((v.languages || []).length > 3) multilingual++;
  }

  return {
    generatedAt: now,
    totalVoices: voices.length,
    totalProviders: providers.size,
    totalLanguages: languages.size,
    withAudio,
    withImage,
    withModelCard,
    byProvider: Object.values(byProvider).sort((a, b) => b.count - a.count),
    byQualityTier: byQuality,
    capabilities: { localModels, multilingual, ssmlSupport },
  };
}

// ─── Generate OpenAPI spec ───────────────────────────────────────────────────

function generateOpenAPI() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Vokda API',
      version: '1.0.0',
      description: `Vokda is the central hub for text-to-speech. This API covers two surfaces:

**Catalog API** (public, no auth) — Browse ${voices.length} voices across ${new Set(voices.map(v => v.providerId)).size} providers.
Served as static JSON from \`https://vokda.iksnae.com/api/v1/\`.

**Synthesis API** (authenticated) — Synthesize speech, manage clips, keys, and provider credentials.
Base URL: \`https://api.vokda.iksnae.com\`.`,
      contact: { name: 'Vokda', url: 'https://vokda.iksnae.com' },
      license: { name: 'Proprietary' },
    },
    servers: [
      { url: 'https://vokda.iksnae.com', description: 'Catalog API (static JSON, public)' },
      { url: 'https://api.vokda.iksnae.com', description: 'Synthesis API (authenticated)' },
    ],
    tags: [
      { name: 'catalog', description: 'Voice catalog (public, no auth)' },
      { name: 'synthesis', description: 'Text-to-speech synthesis' },
      { name: 'clips', description: 'Audio clip management' },
      { name: 'credentials', description: 'Provider credential management (BYOK)' },
      { name: 'keys', description: 'Vokda API key management' },
      { name: 'usage', description: 'Storage and quota' },
    ],
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Vokda API key (`vk_live_...`) or Cognito JWT (`eyJ...`)',
        },
      },
    },
    paths: {
      // ─── Catalog (public) ───
      '/api/v1/voices.json': {
        get: {
          operationId: 'listVoices',
          summary: 'List all voices',
          description: `Returns the full voice catalog (${voices.length} voices). No authentication required.`,
          tags: ['catalog'],
          security: [],
          responses: { 200: { description: 'Voice catalog' } },
        },
      },
      '/api/v1/voices/{voiceId}.json': {
        get: {
          operationId: 'getVoice',
          summary: 'Get voice detail',
          description: 'Returns full detail for a single voice including model card, samples, and variants.',
          tags: ['catalog'],
          security: [],
          parameters: [{ name: 'voiceId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Voice detail' },
            404: { description: 'Voice not found' },
          },
        },
      },
      '/api/v1/providers.json': {
        get: {
          operationId: 'listProviders',
          summary: 'List all providers',
          description: 'Provider directory with voice counts, capabilities, pricing, and links.',
          tags: ['catalog'],
          security: [],
          responses: { 200: { description: 'Provider list' } },
        },
      },
      '/api/v1/stats.json': {
        get: {
          operationId: 'getCatalogStats',
          summary: 'Catalog statistics',
          description: 'Aggregate stats: voice counts, provider breakdown, quality tiers, capabilities.',
          tags: ['catalog'],
          security: [],
          responses: { 200: { description: 'Catalog stats' } },
        },
      },
      // ─── Synthesis ───
      '/v1/synthesize': {
        post: {
          operationId: 'synthesize',
          summary: 'Synthesize speech',
          description: 'Generate speech from text or SSML using a connected provider. Requires a stored provider credential.',
          tags: ['synthesis'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object',
              required: ['text', 'provider'],
              properties: {
                text: { type: 'string', description: 'Input text (max 5,000 chars)', maxLength: 5000 },
                provider: { type: 'string', description: 'Provider ID', enum: ['openai', 'elevenlabs', 'deepgram', 'gemini-tts', 'cartesia', 'lmnt', 'gcp-tts', 'azure-speech', 'aws-polly'] },
                providerVoiceId: { type: 'string', description: "Provider's own voice ID" },
                voiceName: { type: 'string', description: 'Display name (stored with clip)' },
                voiceId: { type: 'string', description: 'Vokda catalog voice ID' },
                mode: { type: 'string', enum: ['text', 'ssml'], default: 'text' },
              },
            }}},
          },
          responses: {
            200: { description: 'Synthesis completed', content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                jobId: { type: 'string' },
                status: { type: 'string', enum: ['completed', 'pending', 'failed'] },
                audioUrl: { type: 'string', description: 'Presigned S3 URL (7-day expiry)' },
                fileSizeBytes: { type: 'integer' },
                durationMs: { type: 'integer', nullable: true },
                latencyMs: { type: 'integer' },
                provider: { type: 'string' },
                voiceName: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            }}}},
            400: { description: 'Bad request (missing field, unsupported provider, no credential)' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      // ─── Clips ───
      '/v1/jobs': {
        get: {
          operationId: 'listClips',
          summary: 'List audio clips',
          tags: ['clips'],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['completed', 'pending', 'failed'] } },
          ],
          responses: { 200: { description: 'Clip list with count' } },
        },
      },
      '/v1/jobs/{id}': {
        get: {
          operationId: 'getClip',
          summary: 'Get clip detail',
          tags: ['clips'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Clip detail with fresh audio URL' }, 404: { description: 'Not found' } },
        },
        patch: {
          operationId: 'updateClip',
          summary: 'Update clip metadata',
          tags: ['clips'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              clipName: { type: 'string', nullable: true, maxLength: 500 },
              clipDescription: { type: 'string', nullable: true, maxLength: 500 },
              clipTags: { type: 'array', items: { type: 'string' }, maxItems: 20 },
            },
          }}}},
          responses: { 200: { description: 'Updated clip' } },
        },
        delete: {
          operationId: 'deleteClip',
          summary: 'Delete clip and audio',
          tags: ['clips'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted with freed bytes' } },
        },
      },
      // ─── Credentials ───
      '/v1/credentials': {
        post: {
          operationId: 'saveCredential',
          summary: 'Store provider credential',
          description: 'Create or update a BYOK provider API key. One credential per provider (upsert).',
          tags: ['credentials'],
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object',
            required: ['providerId', 'credentialData'],
            properties: {
              providerId: { type: 'string', enum: ['openai', 'elevenlabs', 'deepgram', 'gemini-tts', 'cartesia', 'lmnt', 'gcp-tts', 'azure-speech', 'aws-polly'] },
              credentialData: {
                type: 'object',
                description: 'Provider-specific credential fields. API key providers: `{"apiKey":"sk-..."}`. Azure: `{"subscriptionKey":"...","region":"eastus"}`. AWS Polly: `{"accessKeyId":"...","secretAccessKey":"...","region":"us-east-1"}`.',
              },
              label: { type: 'string', description: 'Optional display label' },
            },
          }}}},
          responses: {
            200: { description: 'Credential saved' },
            400: { description: 'Invalid provider or missing fields' },
          },
        },
        get: {
          operationId: 'listCredentials',
          summary: 'List provider credentials',
          description: 'Returns all stored credentials with masked key values.',
          tags: ['credentials'],
          responses: { 200: { description: 'Credential list' } },
        },
      },
      '/v1/credentials/test': {
        post: {
          operationId: 'testCredential',
          summary: 'Test a credential (dry run)',
          description: 'Verifies a credential works by attempting a minimal synthesis. Does NOT store the credential.',
          tags: ['credentials'],
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object',
            required: ['providerId', 'credentialData'],
            properties: {
              providerId: { type: 'string' },
              credentialData: { type: 'object' },
            },
          }}}},
          responses: { 200: { description: '`{success, latencyMs, error?}`' } },
        },
      },
      '/v1/credentials/{providerId}': {
        delete: {
          operationId: 'deleteCredential',
          summary: 'Remove provider credential',
          tags: ['credentials'],
          parameters: [{ name: 'providerId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' }, 404: { description: 'No credential for this provider' } },
        },
      },
      // ─── Keys ───
      '/v1/keys': {
        post: {
          operationId: 'createApiKey',
          summary: 'Create Vokda API key',
          description: 'Creates a `vk_live_...` key. The full key is returned only once.',
          tags: ['keys'],
          requestBody: { content: { 'application/json': { schema: {
            type: 'object',
            properties: { label: { type: 'string' } },
          }}}},
          responses: { 201: { description: 'Key created (full value shown once)' } },
        },
        get: {
          operationId: 'listApiKeys',
          summary: 'List API keys',
          description: 'Returns all keys with masked values.',
          tags: ['keys'],
          responses: { 200: { description: 'Key list' } },
        },
      },
      '/v1/keys/{id}': {
        delete: {
          operationId: 'revokeApiKey',
          summary: 'Revoke API key',
          tags: ['keys'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Revoked' } },
        },
      },
      // ─── Usage ───
      '/v1/media/usage': {
        get: {
          operationId: 'getUsage',
          summary: 'Storage usage and quota',
          tags: ['usage'],
          responses: { 200: { description: 'Usage stats (totalBytes, fileCount, quotaBytes, usagePercent)' } },
        },
      },
    },
  };
}

// ─── Write files ─────────────────────────────────────────────────────────────

mkdirSync(join(OUT_DIR, 'voices'), { recursive: true });

// voices.json (full catalog)
writeFileSync(join(OUT_DIR, 'voices.json'), JSON.stringify(catalog, null, 2));
console.log(`  voices.json (${voices.length} voices)`);

// Individual voice files
// Clean out old files first
const existingFiles = readdirSync(join(OUT_DIR, 'voices'));
for (const f of existingFiles) unlinkSync(join(OUT_DIR, 'voices', f));

for (const v of voices) {
  writeFileSync(join(OUT_DIR, 'voices', `${v.id}.json`), JSON.stringify(v, null, 2));
}
console.log(`  voices/{id}.json (${voices.length} files)`);

// providers.json
const providersData = generateProviders();
writeFileSync(join(OUT_DIR, 'providers.json'), JSON.stringify(providersData, null, 2));
console.log(`  providers.json (${providersData.total} providers)`);

// stats.json
const statsData = generateStats();
writeFileSync(join(OUT_DIR, 'stats.json'), JSON.stringify(statsData, null, 2));
console.log(`  stats.json`);

// openapi.json
const openapiSpec = generateOpenAPI();
writeFileSync(join(OUT_DIR, 'openapi.json'), JSON.stringify(openapiSpec, null, 2));
console.log(`  openapi.json`);

console.log('\nDone.');
