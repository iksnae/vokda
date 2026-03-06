#!/usr/bin/env node
/**
 * Smoke test for @vokda/sdk — run against live APIs.
 *
 * Usage: node packages/sdk/test/smoke.mjs [API_KEY]
 */

import { VokdaCatalogClient, VokdaClient, VokdaApiError } from '../dist/index.js';

const API_KEY = process.argv[2] || process.env.VOKDA_API_KEY;

async function testCatalog() {
  console.log('── Catalog Client ──');
  const catalog = new VokdaCatalogClient();

  const { voices } = await catalog.listVoices();
  console.log(`  listVoices: ${voices.length} voices ✓`);

  const voice = await catalog.getVoice(voices[0].id);
  console.log(`  getVoice: ${voice.name} (${voice.provider}) ✓`);

  const { providers, total } = await catalog.listProviders();
  console.log(`  listProviders: ${total} providers ✓`);

  const provider = await catalog.getProvider('openai');
  console.log(`  getProvider: ${provider?.name} — ${provider?.voiceCount} voices ✓`);

  const stats = await catalog.getStats();
  console.log(`  getStats: ${stats.totalVoices} voices, ${stats.totalProviders} providers, ${stats.totalLanguages} languages ✓`);
}

async function testAuthenticated() {
  if (!API_KEY) {
    console.log('\n── Authenticated Client (skipped — no API_KEY) ──');
    return;
  }

  console.log('\n── Authenticated Client ──');
  const client = new VokdaClient({ apiKey: API_KEY });

  const { credentials, count } = await client.listCredentials();
  console.log(`  listCredentials: ${count} credentials ✓`);

  const { keys } = await client.listApiKeys();
  console.log(`  listApiKeys: ${keys.length} keys ✓`);

  const usage = await client.getUsage();
  console.log(`  getUsage: ${usage.fileCount} clips, ${(usage.totalBytes / 1024).toFixed(0)} KB, ${usage.usagePercent}% ✓`);

  const { jobs, count: clipCount } = await client.listClips({ limit: 5 });
  console.log(`  listClips: ${clipCount} total, fetched ${jobs.length} ✓`);

  if (jobs.length > 0) {
    const clip = await client.getClip(jobs[0].jobId);
    console.log(`  getClip: ${clip.jobId} (${clip.provider}/${clip.voiceName}) ✓`);
  }

  // Test error handling
  try {
    await client.synthesize({ text: '', provider: 'openai' });
  } catch (err) {
    if (err instanceof VokdaApiError) {
      console.log(`  error handling: VokdaApiError ${err.status} "${err.body.error}" ✓`);
    }
  }
}

await testCatalog();
await testAuthenticated();
console.log('\n✅ All smoke tests passed');
