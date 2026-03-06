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
  const providerEnum = ['openai', 'elevenlabs', 'deepgram', 'gemini-tts', 'cartesia', 'lmnt', 'gcp-tts', 'azure-speech', 'aws-polly'];

  // ── Component schemas ──

  const schemas = {
    Error: {
      type: 'object',
      required: ['error'],
      properties: {
        error: { type: 'string', description: 'Machine-readable error code or short message' },
        message: { type: 'string', description: 'Human-readable detail' },
        supported: { type: 'array', items: { type: 'string' }, description: 'Supported values (when applicable)' },
      },
    },

    // ── Catalog ──

    VoiceSample: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
        scriptKey: { type: 'string' },
        transcript: { type: 'string' },
        audioUrl: { type: 'string', format: 'uri' },
      },
    },
    VoiceVariant: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        sourceKey: { type: 'string', description: 'Provider-specific voice identifier' },
        sourceType: { type: 'string' },
        runnable: { type: 'boolean' },
        previewOnly: { type: 'boolean' },
        supportsSsml: { type: 'boolean' },
        outputFormats: { type: 'array', items: { type: 'string' } },
        maxInputChars: { type: 'integer', nullable: true },
      },
    },
    VoiceMetadata: {
      type: 'object',
      properties: {
        genderPresentation: { type: 'string', enum: ['male', 'female', 'neutral'] },
        agePresentation: { type: 'string' },
        toneTags: { type: 'array', items: { type: 'string' } },
        useCases: { type: 'array', items: { type: 'string' } },
        audienceTags: { type: 'array', items: { type: 'string' } },
        machineTags: { type: 'array', items: { type: 'string' } },
        shortLabel: { type: 'string' },
        searchDescription: { type: 'string' },
        metadataQuality: { type: 'string', enum: ['curated', 'generated', 'sparse'] },
      },
    },
    ModelCard: {
      type: 'object',
      properties: {
        modelFamily: { type: 'string' },
        architecture: { type: 'string' },
        providerName: { type: 'string' },
        providerType: { type: 'string' },
        providerUrl: { type: 'string', format: 'uri' },
        releaseDate: { type: 'string' },
        sampleRate: { type: 'integer' },
        multilingual: { type: 'boolean' },
        ssmlSupport: { type: 'boolean' },
        emotionControl: { type: 'boolean' },
        voiceCloning: { type: 'boolean' },
        streamingSupport: { type: 'boolean' },
        wordTimestamps: { type: 'boolean' },
        latencyMs: { type: 'string' },
        license: { type: 'string' },
        licenseUrl: { type: 'string', format: 'uri' },
        commercialUse: { type: 'boolean' },
        attributionRequired: { type: 'boolean' },
        gdprCompliant: { type: 'boolean' },
        knownLimitations: { type: 'array', items: { type: 'string' } },
      },
    },
    Voice: {
      type: 'object',
      required: ['id', 'name', 'provider', 'providerId'],
      properties: {
        id: { type: 'string', description: 'ULID' },
        name: { type: 'string' },
        provider: { type: 'string', description: 'Display name' },
        providerId: { type: 'string', description: 'Machine identifier' },
        providerVoiceId: { type: 'string', description: "Provider's own voice ID" },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        languages: { type: 'array', items: { type: 'string' }, description: 'BCP 47 codes' },
        qualityTier: { type: 'string', enum: ['premium', 'standard', 'basic'] },
        gender: { type: 'string', enum: ['male', 'female', 'neutral'] },
        imageUrl: { type: 'string', format: 'uri', nullable: true },
        licenseNotes: { type: 'string' },
        metadata: { $ref: '#/components/schemas/VoiceMetadata' },
        modelCard: { $ref: '#/components/schemas/ModelCard' },
        variants: { type: 'array', items: { $ref: '#/components/schemas/VoiceVariant' } },
        samples: { type: 'array', items: { $ref: '#/components/schemas/VoiceSample' } },
      },
    },
    VoiceCatalog: {
      type: 'object',
      properties: {
        voices: { type: 'array', items: { $ref: '#/components/schemas/Voice' } },
        generatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Provider: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string', enum: ['cloud', 'local', 'free'] },
        description: { type: 'string', nullable: true },
        voiceCount: { type: 'integer' },
        languages: { type: 'array', items: { type: 'string' } },
        languageCount: { type: 'integer' },
        qualityTiers: { type: 'array', items: { type: 'string' } },
        genders: { type: 'array', items: { type: 'string' } },
        ssmlCapable: { type: 'boolean' },
        audioSampleCoverage: { type: 'string' },
        hasSynthesis: { type: 'boolean' },
        authType: { type: 'string', enum: ['api_key', 'subscription_key', 'aws_credentials', 'none'] },
        websiteUrl: { type: 'string', format: 'uri', nullable: true },
        docsUrl: { type: 'string', format: 'uri', nullable: true },
        signupUrl: { type: 'string', format: 'uri', nullable: true },
        pricingUrl: { type: 'string', format: 'uri', nullable: true },
        pricingSummary: { type: 'string', nullable: true },
        freeTier: { type: 'string', nullable: true },
        license: { type: 'string', nullable: true },
        commercialUse: { type: 'boolean', nullable: true },
      },
    },
    ProviderList: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        generatedAt: { type: 'string', format: 'date-time' },
        providers: { type: 'array', items: { $ref: '#/components/schemas/Provider' } },
      },
    },
    CatalogStats: {
      type: 'object',
      properties: {
        generatedAt: { type: 'string', format: 'date-time' },
        totalVoices: { type: 'integer' },
        totalProviders: { type: 'integer' },
        totalLanguages: { type: 'integer' },
        withAudio: { type: 'integer' },
        withImage: { type: 'integer' },
        withModelCard: { type: 'integer' },
        byProvider: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              count: { type: 'integer' },
            },
          },
        },
        byQualityTier: {
          type: 'object',
          properties: {
            premium: { type: 'integer' },
            standard: { type: 'integer' },
            basic: { type: 'integer' },
          },
        },
        capabilities: {
          type: 'object',
          properties: {
            localModels: { type: 'integer' },
            multilingual: { type: 'integer' },
            ssmlSupport: { type: 'integer' },
          },
        },
      },
    },

    // ── Synthesis ──

    SynthesizeRequest: {
      type: 'object',
      required: ['text', 'provider'],
      properties: {
        text: { type: 'string', description: 'Input text or SSML', maxLength: 5000 },
        provider: { type: 'string', enum: providerEnum },
        providerVoiceId: { type: 'string', description: "Provider's own voice ID" },
        voiceName: { type: 'string', description: 'Display name (stored with clip)' },
        voiceId: { type: 'string', description: 'Vokda catalog voice ID' },
        mode: { type: 'string', enum: ['text', 'ssml'], default: 'text' },
        async: { type: 'boolean', default: false, description: 'Queue for async processing' },
        options: { type: 'object', description: 'Provider-specific options (format, model, etc.)' },
      },
    },
    SynthesizeResponse: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        status: { type: 'string', enum: ['completed', 'pending', 'failed'] },
        audioUrl: { type: 'string', format: 'uri', description: 'Presigned S3 URL (7-day expiry)' },
        fileSizeBytes: { type: 'integer' },
        durationMs: { type: 'integer', nullable: true },
        latencyMs: { type: 'integer' },
        provider: { type: 'string' },
        voiceId: { type: 'string', nullable: true },
        voiceName: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },

    // ── Clips ──

    Clip: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        voiceId: { type: 'string' },
        voiceName: { type: 'string', nullable: true },
        provider: { type: 'string' },
        status: { type: 'string', enum: ['completed', 'pending', 'failed'] },
        inputText: { type: 'string' },
        inputMode: { type: 'string', enum: ['text', 'ssml'] },
        clipName: { type: 'string', nullable: true },
        clipDescription: { type: 'string', nullable: true },
        clipTags: { type: 'array', items: { type: 'string' } },
        audioUrl: { type: 'string', format: 'uri', nullable: true },
        fileSizeBytes: { type: 'integer', nullable: true },
        durationMs: { type: 'integer', nullable: true },
        latencyMs: { type: 'integer', nullable: true },
        errorMessage: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    ClipList: {
      type: 'object',
      properties: {
        jobs: { type: 'array', items: { $ref: '#/components/schemas/Clip' } },
        count: { type: 'integer' },
      },
    },
    ClipUpdate: {
      type: 'object',
      properties: {
        clipName: { type: 'string', nullable: true, maxLength: 500 },
        clipDescription: { type: 'string', nullable: true, maxLength: 500 },
        clipTags: { type: 'array', items: { type: 'string' }, maxItems: 20 },
      },
    },
    ClipDeleted: {
      type: 'object',
      properties: {
        deleted: { type: 'boolean' },
        freedBytes: { type: 'integer' },
      },
    },

    // ── Credentials ──

    SaveCredentialRequest: {
      type: 'object',
      required: ['providerId', 'credentialData'],
      properties: {
        providerId: { type: 'string', enum: providerEnum },
        credentialData: {
          type: 'object',
          description: 'Provider-specific fields. API key: `{"apiKey":"sk-..."}`. Azure: `{"subscriptionKey":"...","region":"eastus"}`. Polly: `{"accessKeyId":"...","secretAccessKey":"...","region":"us-east-1"}`.',
        },
        label: { type: 'string', description: 'Optional display label' },
      },
    },
    CredentialSaved: {
      type: 'object',
      properties: {
        providerId: { type: 'string' },
        label: { type: 'string' },
        authType: { type: 'string', enum: ['api_key', 'subscription_key', 'aws_credentials'] },
        status: { type: 'string', enum: ['active'] },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Credential: {
      type: 'object',
      properties: {
        providerId: { type: 'string' },
        label: { type: 'string' },
        authType: { type: 'string', enum: ['api_key', 'subscription_key', 'aws_credentials'] },
        status: { type: 'string' },
        maskedKey: { type: 'string', nullable: true, description: 'First 4 + last 4 chars' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        lastTestedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    CredentialList: {
      type: 'object',
      properties: {
        credentials: { type: 'array', items: { $ref: '#/components/schemas/Credential' } },
        count: { type: 'integer' },
      },
    },
    CredentialTestRequest: {
      type: 'object',
      required: ['providerId', 'credentialData'],
      properties: {
        providerId: { type: 'string', enum: providerEnum },
        credentialData: { type: 'object' },
      },
    },
    CredentialTestResult: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        latencyMs: { type: 'integer' },
        error: { type: 'string', description: 'Present when success=false' },
      },
    },
    CredentialDeleted: {
      type: 'object',
      properties: {
        deleted: { type: 'boolean' },
        providerId: { type: 'string' },
      },
    },

    // ── Keys ──

    ApiKey: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        keyPrefix: { type: 'string', description: 'Masked prefix (vk_live__Cve...)' },
        label: { type: 'string', nullable: true },
        status: { type: 'string', enum: ['active', 'revoked'] },
        createdAt: { type: 'string', format: 'date-time' },
        lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    ApiKeyCreated: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        key: { type: 'string', description: 'Full key value (shown only once)' },
        keyPrefix: { type: 'string' },
        label: { type: 'string' },
        status: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    ApiKeyList: {
      type: 'object',
      properties: {
        keys: { type: 'array', items: { $ref: '#/components/schemas/ApiKey' } },
      },
    },

    // ── Usage ──

    Usage: {
      type: 'object',
      properties: {
        totalBytes: { type: 'integer' },
        fileCount: { type: 'integer' },
        quotaBytes: { type: 'integer' },
        usagePercent: { type: 'number' },
        remainingBytes: { type: 'integer' },
      },
    },
  };

  const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
  const jsonContent = (schemaName) => ({ content: { 'application/json': { schema: ref(schemaName) } } });
  const errorResp = (desc) => ({ description: desc, ...jsonContent('Error') });

  return {
    openapi: '3.1.0',
    info: {
      title: 'Vokda API',
      version: '1.0.0',
      description: `Vokda is the central hub for text-to-speech voice discovery and synthesis.\n\n**Catalog API** (public, no auth) — Browse ${voices.length} voices across ${new Set(voices.map(v => v.providerId)).size} providers.\nBase URL: \`https://vokda.iksnae.com\`\n\n**Synthesis API** (authenticated) — Synthesize speech, manage clips, keys, and provider credentials.\nBase URL: \`https://api.vokda.iksnae.com\`\n\nAuthentication: Include \`Authorization: Bearer <token>\` header with either a Vokda API key (\`vk_live_...\`) or a Cognito JWT.`,
      contact: { name: 'Vokda', url: 'https://vokda.iksnae.com' },
      license: { name: 'Proprietary' },
    },
    servers: [
      { url: 'https://vokda.iksnae.com', description: 'Catalog API (static JSON, public)' },
      { url: 'https://api.vokda.iksnae.com', description: 'Synthesis API (authenticated)' },
    ],
    tags: [
      { name: 'catalog', description: 'Voice catalog — browse voices, providers, stats (public, no auth)' },
      { name: 'synthesis', description: 'Text-to-speech synthesis (BYOK)' },
      { name: 'clips', description: 'Audio clip storage and metadata' },
      { name: 'credentials', description: 'Provider credential management (BYOK)' },
      { name: 'keys', description: 'Vokda API key management' },
      { name: 'usage', description: 'Storage quota and usage' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Vokda API key (`vk_live_...`) or Cognito JWT',
        },
      },
      schemas,
    },
    security: [{ BearerAuth: [] }],
    paths: {
      // ── Catalog ──
      '/api/v1/voices.json': {
        get: {
          operationId: 'listVoices',
          summary: 'List all voices',
          description: `Returns the full voice catalog (${voices.length} voices).`,
          tags: ['catalog'],
          security: [],
          responses: {
            200: { description: 'Voice catalog', ...jsonContent('VoiceCatalog') },
          },
        },
      },
      '/api/v1/voices/{voiceId}.json': {
        get: {
          operationId: 'getVoice',
          summary: 'Get voice detail',
          description: 'Returns full detail for a single voice.',
          tags: ['catalog'],
          security: [],
          parameters: [{ name: 'voiceId', in: 'path', required: true, schema: { type: 'string' }, description: 'Voice ULID' }],
          responses: {
            200: { description: 'Voice detail', ...jsonContent('Voice') },
            404: errorResp('Voice not found'),
          },
        },
      },
      '/api/v1/providers.json': {
        get: {
          operationId: 'listProviders',
          summary: 'List all providers',
          description: 'Provider directory with capabilities, pricing, and links.',
          tags: ['catalog'],
          security: [],
          responses: {
            200: { description: 'Provider list', ...jsonContent('ProviderList') },
          },
        },
      },
      '/api/v1/stats.json': {
        get: {
          operationId: 'getCatalogStats',
          summary: 'Catalog statistics',
          description: 'Aggregate stats: voice counts, provider breakdown, quality tiers.',
          tags: ['catalog'],
          security: [],
          responses: {
            200: { description: 'Catalog stats', ...jsonContent('CatalogStats') },
          },
        },
      },
      // ── Synthesis ──
      '/v1/synthesize': {
        post: {
          operationId: 'synthesize',
          summary: 'Synthesize speech',
          description: 'Generate speech from text or SSML. Requires a stored provider credential.',
          tags: ['synthesis'],
          requestBody: { required: true, ...jsonContent('SynthesizeRequest') },
          responses: {
            200: { description: 'Synthesis completed', ...jsonContent('SynthesizeResponse') },
            202: { description: 'Async job queued (when async=true)', ...jsonContent('SynthesizeResponse') },
            400: errorResp('Bad request'),
            401: errorResp('Unauthorized'),
          },
        },
      },
      // ── Clips ──
      '/v1/jobs': {
        get: {
          operationId: 'listClips',
          summary: 'List audio clips',
          tags: ['clips'],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 }, description: 'Max clips to return' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['completed', 'pending', 'failed'] } },
          ],
          responses: {
            200: { description: 'Clip list', ...jsonContent('ClipList') },
            401: errorResp('Unauthorized'),
          },
        },
      },
      '/v1/jobs/{id}': {
        get: {
          operationId: 'getClip',
          summary: 'Get clip detail',
          tags: ['clips'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Clip with fresh presigned audio URL', ...jsonContent('Clip') },
            404: errorResp('Clip not found'),
          },
        },
        patch: {
          operationId: 'updateClip',
          summary: 'Update clip metadata',
          tags: ['clips'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { ...jsonContent('ClipUpdate') },
          responses: {
            200: { description: 'Updated clip', ...jsonContent('Clip') },
            404: errorResp('Clip not found'),
          },
        },
        delete: {
          operationId: 'deleteClip',
          summary: 'Delete clip and audio',
          tags: ['clips'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Clip deleted', ...jsonContent('ClipDeleted') },
            404: errorResp('Clip not found'),
          },
        },
      },
      // ── Credentials ──
      '/v1/credentials': {
        post: {
          operationId: 'saveCredential',
          summary: 'Store provider credential',
          description: 'Create or update a BYOK provider key. One credential per provider (upsert).',
          tags: ['credentials'],
          requestBody: { required: true, ...jsonContent('SaveCredentialRequest') },
          responses: {
            200: { description: 'Credential saved', ...jsonContent('CredentialSaved') },
            400: errorResp('Invalid provider or missing fields'),
          },
        },
        get: {
          operationId: 'listCredentials',
          summary: 'List provider credentials',
          description: 'Returns all stored credentials with masked key values.',
          tags: ['credentials'],
          responses: {
            200: { description: 'Credential list', ...jsonContent('CredentialList') },
          },
        },
      },
      '/v1/credentials/test': {
        post: {
          operationId: 'testCredential',
          summary: 'Test credential (dry run)',
          description: 'Verifies a credential by performing a minimal synthesis. Does NOT store it.',
          tags: ['credentials'],
          requestBody: { required: true, ...jsonContent('CredentialTestRequest') },
          responses: {
            200: { description: 'Test result', ...jsonContent('CredentialTestResult') },
          },
        },
      },
      '/v1/credentials/{providerId}': {
        delete: {
          operationId: 'deleteCredential',
          summary: 'Remove provider credential',
          tags: ['credentials'],
          parameters: [{ name: 'providerId', in: 'path', required: true, schema: { type: 'string', enum: providerEnum } }],
          responses: {
            200: { description: 'Credential deleted', ...jsonContent('CredentialDeleted') },
            404: errorResp('No credential for this provider'),
          },
        },
      },
      // ── Keys ──
      '/v1/keys': {
        post: {
          operationId: 'createApiKey',
          summary: 'Create Vokda API key',
          description: 'Creates a `vk_live_...` key. The full key value is returned **only once**.',
          tags: ['keys'],
          requestBody: { content: { 'application/json': { schema: {
            type: 'object',
            properties: { label: { type: 'string', description: 'Optional label for the key' } },
          }}}},
          responses: {
            201: { description: 'Key created', ...jsonContent('ApiKeyCreated') },
          },
        },
        get: {
          operationId: 'listApiKeys',
          summary: 'List API keys',
          tags: ['keys'],
          responses: {
            200: { description: 'Key list', ...jsonContent('ApiKeyList') },
          },
        },
      },
      '/v1/keys/{id}': {
        delete: {
          operationId: 'revokeApiKey',
          summary: 'Revoke API key',
          tags: ['keys'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Key revoked' },
          },
        },
      },
      // ── Usage ──
      '/v1/media/usage': {
        get: {
          operationId: 'getUsage',
          summary: 'Storage usage and quota',
          tags: ['usage'],
          responses: {
            200: { description: 'Usage stats', ...jsonContent('Usage') },
          },
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
