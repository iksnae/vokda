#!/usr/bin/env node
/**
 * publish-catalog.mjs — Generates static catalog JSON from voice/provider data.
 *
 * This script serves two modes:
 *
 * 1. **Local mode** (default): Reads from apps/web/static/data/voices.json
 *    and generates the API JSON files. This is the current workflow.
 *
 * 2. **DynamoDB mode** (--from-db): Reads from DynamoDB VoiceRecord/ProviderRecord
 *    tables and generates both voices.json AND API JSON files.
 *    Requires amplify_outputs.json and valid AWS credentials.
 *
 * Output:
 *   static/data/voices.json          — catalog (if --from-db)
 *   static/api/v1/voices.json        — full API catalog
 *   static/api/v1/voices/{id}.json   — per-voice detail
 *   static/api/v1/providers.json     — provider registry
 *   static/api/v1/stats.json         — catalog statistics
 *   static/api/v1/openapi.json       — OpenAPI spec
 *   static/.well-known/ai-plugin.json
 *   static/.well-known/agent.json
 *   static/sitemap.xml
 *   static/robots.txt
 *
 * This replaces generate-api.mjs and extends it with the DynamoDB source option.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const FROM_DB = process.argv.includes('--from-db');
const BASE_URL = 'https://vokda.iksnae.com';
const VOICES_PATH = 'apps/web/static/data/voices.json';
const OUT = 'apps/web/static';

// ─── Load voices ───
async function loadVoices() {
  if (FROM_DB) {
    console.log('📡 Loading from DynamoDB...');
    // TODO: implement DynamoDB query when sandbox is available
    // For now, fall through to local file
    console.log('   (DynamoDB mode not yet wired — falling back to local file)');
  }

  const raw = JSON.parse(readFileSync(VOICES_PATH, 'utf8'));
  const voices = raw.voices ?? (Array.isArray(raw) ? raw : []);
  console.log(`📦 Loaded ${voices.length} voices from ${VOICES_PATH}`);
  return voices;
}

// ─── Generate all static API files ───
function generateApiFiles(voices) {
  mkdirSync(`${OUT}/api/v1/voices`, { recursive: true });

  // voices.json (catalog list)
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
      shortLabel: v.metadata?.shortLabel,
      toneTags: v.metadata?.toneTags,
      useCases: v.metadata?.useCases,
      genderPresentation: v.metadata?.genderPresentation,
      agePresentation: v.metadata?.agePresentation,
    }
  }));

  writeFileSync(`${OUT}/api/v1/voices.json`, JSON.stringify({
    $schema: `${BASE_URL}/api/v1/openapi.json`,
    total: voiceList.length,
    generatedAt: new Date().toISOString(),
    voices: voiceList
  }, null, 2));
  console.log(`  voices.json: ${voiceList.length} voices`);

  // Per-voice detail JSON
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

  // providers.json
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

  // stats.json
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
    totalLanguages: new Set(voices.flatMap(v => v.languages)).size,
    capabilities: {
      localModels: voices.filter(v => v.tags?.includes('local') || v.tags?.includes('mlx')).length,
      multilingual: voices.filter(v => v.languages.length > 1).length,
      ssmlSupport: voices.filter(v => v.variants?.some(vr => vr.supportsSsml)).length,
    }
  };

  writeFileSync(`${OUT}/api/v1/stats.json`, JSON.stringify(stats, null, 2));
  console.log(`  stats.json`);

  // OpenAPI spec
  const openapi = {
    openapi: '3.1.0',
    info: {
      title: 'Vokda Voice Catalog API',
      version: '1.0.0',
      description: 'Read-only API for discovering and browsing TTS voices. All endpoints return static JSON — no authentication required.',
      contact: { name: 'Vokda', url: BASE_URL },
    },
    servers: [{ url: BASE_URL, description: 'Production' }],
    paths: {
      '/api/v1/voices.json': {
        get: { operationId: 'listVoices', summary: 'List all voices', tags: ['voices'] }
      },
      '/api/v1/voices/{voiceId}.json': {
        get: {
          operationId: 'getVoice', summary: 'Get voice detail', tags: ['voices'],
          parameters: [{ name: 'voiceId', in: 'path', required: true, schema: { type: 'string' } }]
        }
      },
      '/api/v1/providers.json': {
        get: { operationId: 'listProviders', summary: 'List providers', tags: ['providers'] }
      },
      '/api/v1/stats.json': {
        get: { operationId: 'getCatalogStats', summary: 'Catalog statistics', tags: ['catalog'] }
      },
    }
  };

  writeFileSync(`${OUT}/api/v1/openapi.json`, JSON.stringify(openapi, null, 2));
  console.log(`  openapi.json`);

  // .well-known/ai-plugin.json
  mkdirSync(`${OUT}/.well-known`, { recursive: true });
  writeFileSync(`${OUT}/.well-known/ai-plugin.json`, JSON.stringify({
    schema_version: 'v1',
    name_for_human: 'Vokda Voice Catalog',
    name_for_model: 'vokda',
    description_for_human: `Discover and browse TTS voices across ${providers.length} providers.`,
    description_for_model: `Search and retrieve TTS voice metadata from the Vokda catalog. ${voices.length} voices across ${providers.length} providers. All endpoints are static JSON — no authentication required.`,
    auth: { type: 'none' },
    api: { type: 'openapi', url: `${BASE_URL}/api/v1/openapi.json` },
    logo_url: `${BASE_URL}/favicon-192.png`,
    contact_email: 'hello@iksnae.com',
    legal_info_url: `${BASE_URL}/terms`,
  }, null, 2));
  console.log(`  .well-known/ai-plugin.json`);

  // .well-known/agent.json
  writeFileSync(`${OUT}/.well-known/agent.json`, JSON.stringify({
    name: 'Vokda',
    description: `TTS voice discovery platform. ${voices.length} voices across ${providers.length} providers.`,
    url: BASE_URL,
    capabilities: ['voice-catalog', 'audio-samples', 'model-cards'],
    api: {
      openapi: `${BASE_URL}/api/v1/openapi.json`,
      endpoints: {
        voices: `${BASE_URL}/api/v1/voices.json`,
        providers: `${BASE_URL}/api/v1/providers.json`,
        stats: `${BASE_URL}/api/v1/stats.json`,
      }
    },
    authentication: 'none',
  }, null, 2));
  console.log(`  .well-known/agent.json`);

  // sitemap.xml
  const today = new Date().toISOString().split('T')[0];
  const sitemapEntries = [
    { url: '/', priority: '1.0', freq: 'weekly' },
    { url: '/collections', priority: '0.6', freq: 'weekly' },
    ...voices.map(v => ({ url: `/voices/${v.id}`, priority: '0.8', freq: 'monthly' })),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map(e => `  <url>
    <loc>${BASE_URL}${e.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.freq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  writeFileSync(`${OUT}/sitemap.xml`, sitemap);
  console.log(`  sitemap.xml: ${sitemapEntries.length} URLs`);

  // robots.txt
  writeFileSync(`${OUT}/robots.txt`, `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`);
  console.log(`  robots.txt`);
}

// ─── Main ───
async function main() {
  const voices = await loadVoices();
  generateApiFiles(voices);
  console.log('\n✅ Done!');
}

main().catch(e => {
  console.error('❌', e);
  process.exit(1);
});
