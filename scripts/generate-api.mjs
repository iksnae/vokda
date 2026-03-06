#!/usr/bin/env node
/**
 * generate-api.mjs — Generates static JSON API files for machine consumption.
 *
 * Output:
 *   static/api/v1/voices.json       — full catalog (array)
 *   static/api/v1/voices/{id}.json  — per-voice detail
 *   static/api/v1/providers.json    — provider registry
 *   static/api/v1/stats.json        — catalog summary
 *   static/api/v1/openapi.json      — OpenAPI 3.1 spec
 *   static/.well-known/ai-plugin.json
 *   static/.well-known/agent.json
 *   static/sitemap.xml
 *   static/robots.txt
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const BASE_URL = 'https://vokda.iksnae.com';
const VOICES_PATH = 'apps/web/static/data/voices.json';
const OUT = 'apps/web/static';

const raw = JSON.parse(readFileSync(VOICES_PATH, 'utf8'));
const voices = Array.isArray(raw) ? raw : raw.voices ?? Object.values(raw);

// ─── API directory ───
mkdirSync(`${OUT}/api/v1/voices`, { recursive: true });

// ─── voices.json (full catalog, slimmed for list view) ───
const voiceList = voices.map(v => ({
  id: v.id,
  name: v.name,
  provider: v.provider,
  providerId: v.providerId,
  description: v.description,
  tags: v.tags,
  languages: v.languages,
  qualityTier: v.qualityTier,
  audioUrl: v.audioUrl ? `${BASE_URL}${v.audioUrl}` : null,
  imageUrl: v.imageUrl ? `${BASE_URL}${v.imageUrl}` : null,
  detailUrl: `${BASE_URL}/api/v1/voices/${v.id}.json`,
  webUrl: `${BASE_URL}/voices/${v.id}`,
  metadata: {
    shortLabel: v.metadata.shortLabel,
    toneTags: v.metadata.toneTags,
    useCases: v.metadata.useCases,
    genderPresentation: v.metadata.genderPresentation,
    agePresentation: v.metadata.agePresentation,
  }
}));

writeFileSync(`${OUT}/api/v1/voices.json`, JSON.stringify({
  $schema: `${BASE_URL}/api/v1/openapi.json`,
  total: voiceList.length,
  generatedAt: new Date().toISOString(),
  voices: voiceList
}, null, 2));
console.log(`  voices.json: ${voiceList.length} voices`);

// ─── Per-voice detail JSON ───
let voiceCount = 0;
for (const v of voices) {
  const detail = {
    ...v,
    audioUrl: v.audioUrl ? `${BASE_URL}${v.audioUrl}` : null,
    imageUrl: v.imageUrl ? `${BASE_URL}${v.imageUrl}` : null,
    ogImageUrl: `${BASE_URL}/og/voices/${v.id}.jpg`,
    webUrl: `${BASE_URL}/voices/${v.id}`,
    apiUrl: `${BASE_URL}/api/v1/voices/${v.id}.json`,
    samples: v.samples?.map(s => ({
      ...s,
      audioUrl: s.audioUrl ? `${BASE_URL}${s.audioUrl}` : null,
    })) ?? [],
  };
  writeFileSync(`${OUT}/api/v1/voices/${v.id}.json`, JSON.stringify(detail, null, 2));
  voiceCount++;
}
console.log(`  voices/{id}.json: ${voiceCount} files`);

// ─── providers.json ───
const providerMap = {};
for (const v of voices) {
  const pid = v.providerId || v.provider.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (!providerMap[pid]) {
    providerMap[pid] = {
      id: pid,
      name: v.provider,
      voiceCount: 0,
      qualityTiers: new Set(),
      languages: new Set(),
      modelCard: v.modelCard ? {
        providerType: v.modelCard.providerType,
        providerUrl: v.modelCard.providerUrl,
        license: v.modelCard.license,
        commercialUse: v.modelCard.commercialUse,
      } : null,
    };
  }
  providerMap[pid].voiceCount++;
  providerMap[pid].qualityTiers.add(v.qualityTier);
  v.languages.forEach(l => providerMap[pid].languages.add(l));
}

const providers = Object.values(providerMap).map(p => ({
  ...p,
  qualityTiers: [...p.qualityTiers],
  languages: [...p.languages].sort(),
}));

writeFileSync(`${OUT}/api/v1/providers.json`, JSON.stringify({
  total: providers.length,
  generatedAt: new Date().toISOString(),
  providers
}, null, 2));
console.log(`  providers.json: ${providers.length} providers`);

// ─── stats.json ───
const stats = {
  generatedAt: new Date().toISOString(),
  totalVoices: voices.length,
  totalProviders: providers.length,
  withAudio: voices.filter(v => v.audioUrl).length,
  withImage: voices.filter(v => v.imageUrl).length,
  withModelCard: voices.filter(v => v.modelCard).length,
  byProvider: providers.map(p => ({ id: p.id, name: p.name, count: p.voiceCount }))
    .sort((a, b) => b.count - a.count),
  byQualityTier: {
    premium: voices.filter(v => v.qualityTier === 'premium').length,
    standard: voices.filter(v => v.qualityTier === 'standard').length,
    basic: voices.filter(v => v.qualityTier === 'basic').length,
  },
  bySourceType: {},
  totalLanguages: new Set(voices.flatMap(v => v.languages)).size,
  capabilities: {
    localModels: voices.filter(v => v.tags.includes('local') || v.tags.includes('mlx')).length,
    cloudProviders: voices.filter(v => v.variants?.some(vr => vr.sourceType === 'cloud_provider')).length,
    multilingual: voices.filter(v => v.languages.length > 1).length,
    ssmlSupport: voices.filter(v => v.variants?.some(vr => vr.supportsSsml)).length,
    emotionControl: voices.filter(v => v.modelCard?.emotionControl).length,
    soundEffects: voices.filter(v => v.tags.includes('sound-effects') || v.tags.includes('sfx')).length,
    styleControl: voices.filter(v => v.tags.includes('style-control')).length,
  }
};

// Source type breakdown
for (const v of voices) {
  for (const vr of (v.variants || [])) {
    stats.bySourceType[vr.sourceType] = (stats.bySourceType[vr.sourceType] || 0) + 1;
  }
}

writeFileSync(`${OUT}/api/v1/stats.json`, JSON.stringify(stats, null, 2));
console.log(`  stats.json`);

// ─── OpenAPI 3.1 spec ───
const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Vokda Voice Catalog API',
    version: '1.0.0',
    description: 'Read-only API for discovering and browsing TTS voices across cloud providers and open models. All endpoints return static JSON — no authentication required.',
    contact: { name: 'Vokda', url: BASE_URL },
    license: { name: 'Proprietary', url: `${BASE_URL}/terms` },
  },
  servers: [{ url: BASE_URL, description: 'Production' }],
  paths: {
    '/api/v1/voices.json': {
      get: {
        operationId: 'listVoices',
        summary: 'List all voices',
        description: 'Returns the full voice catalog with summary metadata. Use client-side filtering on the response.',
        responses: {
          '200': {
            description: 'Voice catalog',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/VoiceCatalog' } } }
          }
        },
        tags: ['voices'],
      }
    },
    '/api/v1/voices/{voiceId}.json': {
      get: {
        operationId: 'getVoice',
        summary: 'Get voice detail',
        description: 'Returns full voice data including model card, samples, variants, and all metadata.',
        parameters: [{
          name: 'voiceId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ULID voice identifier',
        }],
        responses: {
          '200': {
            description: 'Voice detail',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Voice' } } }
          }
        },
        tags: ['voices'],
      }
    },
    '/api/v1/providers.json': {
      get: {
        operationId: 'listProviders',
        summary: 'List all providers',
        description: 'Returns provider registry with voice counts and capabilities.',
        responses: {
          '200': {
            description: 'Provider list',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderList' } } }
          }
        },
        tags: ['providers'],
      }
    },
    '/api/v1/stats.json': {
      get: {
        operationId: 'getCatalogStats',
        summary: 'Catalog statistics',
        description: 'Returns aggregate statistics about the voice catalog.',
        responses: {
          '200': {
            description: 'Catalog stats',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CatalogStats' } } }
          }
        },
        tags: ['catalog'],
      }
    },
  },
  components: {
    schemas: {
      VoiceCatalog: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          generatedAt: { type: 'string', format: 'date-time' },
          voices: { type: 'array', items: { $ref: '#/components/schemas/VoiceSummary' } },
        }
      },
      VoiceSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ULID identifier' },
          name: { type: 'string' },
          provider: { type: 'string' },
          providerId: { type: 'string' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          languages: { type: 'array', items: { type: 'string' } },
          qualityTier: { type: 'string', enum: ['basic', 'standard', 'premium'] },
          audioUrl: { type: 'string', format: 'uri', nullable: true },
          imageUrl: { type: 'string', format: 'uri', nullable: true },
          detailUrl: { type: 'string', format: 'uri' },
          webUrl: { type: 'string', format: 'uri' },
        }
      },
      Voice: {
        type: 'object',
        description: 'Full voice detail including model card, samples, and variants.',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          provider: { type: 'string' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          languages: { type: 'array', items: { type: 'string' } },
          audioUrl: { type: 'string', format: 'uri', nullable: true },
          modelCard: { type: 'object', description: '50+ fields of model metadata' },
          samples: { type: 'array', items: { type: 'object' } },
          variants: { type: 'array', items: { type: 'object' } },
        }
      },
      ProviderList: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          providers: { type: 'array', items: { $ref: '#/components/schemas/Provider' } },
        }
      },
      Provider: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          voiceCount: { type: 'integer' },
          qualityTiers: { type: 'array', items: { type: 'string' } },
          languages: { type: 'array', items: { type: 'string' } },
        }
      },
      CatalogStats: {
        type: 'object',
        properties: {
          totalVoices: { type: 'integer' },
          totalProviders: { type: 'integer' },
          withAudio: { type: 'integer' },
          withModelCard: { type: 'integer' },
          capabilities: { type: 'object' },
        }
      },
    }
  }
};

writeFileSync(`${OUT}/api/v1/openapi.json`, JSON.stringify(openapi, null, 2));
console.log(`  openapi.json`);

// ─── .well-known/ai-plugin.json (ChatGPT/Agent plugin format) ───
const aiPlugin = {
  schema_version: 'v1',
  name_for_human: 'Vokda Voice Catalog',
  name_for_model: 'vokda',
  description_for_human: 'Discover and browse TTS voices across 19 providers — cloud APIs and local open models.',
  description_for_model: 'Search and retrieve text-to-speech (TTS) voice metadata from the Vokda catalog. The catalog contains 180 voices across 19 providers including AWS Polly, Azure Speech, Google Cloud TTS, Gemini TTS, OpenAI, ElevenLabs, Kokoro, KittenTTS, Bark, and more. Each voice has audio samples, model cards with technical specifications, and provider compatibility information. Use /api/v1/voices.json for the full list, /api/v1/voices/{id}.json for details, /api/v1/providers.json for provider info, and /api/v1/stats.json for catalog statistics. All endpoints are static JSON — no authentication required.',
  auth: { type: 'none' },
  api: {
    type: 'openapi',
    url: `${BASE_URL}/api/v1/openapi.json`,
  },
  logo_url: `${BASE_URL}/favicon-192.png`,
  contact_email: 'hello@iksnae.com',
  legal_info_url: `${BASE_URL}/terms`,
};

mkdirSync(`${OUT}/.well-known`, { recursive: true });
writeFileSync(`${OUT}/.well-known/ai-plugin.json`, JSON.stringify(aiPlugin, null, 2));
console.log(`  .well-known/ai-plugin.json`);

// ─── .well-known/agent.json (emerging agent discovery) ───
const agentJson = {
  name: 'Vokda',
  description: 'TTS voice discovery and curation platform. Browse 180 voices across 19 providers.',
  url: BASE_URL,
  capabilities: ['voice-catalog', 'audio-samples', 'model-cards', 'provider-comparison'],
  api: {
    openapi: `${BASE_URL}/api/v1/openapi.json`,
    endpoints: {
      voices: `${BASE_URL}/api/v1/voices.json`,
      providers: `${BASE_URL}/api/v1/providers.json`,
      stats: `${BASE_URL}/api/v1/stats.json`,
    }
  },
  data_formats: ['application/json'],
  authentication: 'none',
  rate_limits: 'No rate limits — static files served via CDN.',
};

writeFileSync(`${OUT}/.well-known/agent.json`, JSON.stringify(agentJson, null, 2));
console.log(`  .well-known/agent.json`);

// ─── sitemap.xml ───
const now = new Date().toISOString().split('T')[0];
const sitemapEntries = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/collections', priority: '0.6', changefreq: 'weekly' },
  ...voices.map(v => ({
    url: `/voices/${v.id}`,
    priority: '0.8',
    changefreq: 'monthly',
  })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map(e => `  <url>
    <loc>${BASE_URL}${e.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

writeFileSync(`${OUT}/sitemap.xml`, sitemap);
console.log(`  sitemap.xml: ${sitemapEntries.length} URLs`);

// ─── robots.txt ───
const robots = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml

# API endpoints (machine-readable)
# ${BASE_URL}/api/v1/voices.json
# ${BASE_URL}/api/v1/providers.json
# ${BASE_URL}/api/v1/stats.json
# ${BASE_URL}/api/v1/openapi.json
# ${BASE_URL}/.well-known/ai-plugin.json
`;

writeFileSync(`${OUT}/robots.txt`, robots);
console.log(`  robots.txt`);

console.log('\nDone!');
