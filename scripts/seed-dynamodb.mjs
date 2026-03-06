#!/usr/bin/env node
/**
 * seed-dynamodb.mjs — Seeds DynamoDB VoiceRecord + ProviderRecord tables.
 *
 * Usage:
 *   node scripts/seed-dynamodb.mjs [--dry-run] [--force]
 *
 * Reads:
 *   - apps/web/static/data/voices.json (550 voices)
 *   - apps/web/src/lib/providers.ts (26 providers)
 *   - amplify_outputs.json (for table name resolution)
 *
 * Writes directly to DynamoDB using AWS SDK (bypasses AppSync auth).
 * Requires AWS credentials in environment.
 *
 * Idempotent: skips records that already exist (by id).
 * Use --force to overwrite existing records.
 */
import { readFileSync } from 'fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const VOICES_PATH = 'apps/web/static/data/voices.json';
const PROVIDERS_PATH = 'apps/web/src/lib/providers.ts';
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

// ─── Resolve table names ───
// Amplify Gen2 tables are named like: VoiceRecord-{apiId}-NONE
function resolveTableNames() {
  // Find table names from amplify_outputs model introspection
  // Or use direct AWS DynamoDB list-tables. For now, hardcode the pattern.
  // We'll discover from the deployed stack.
  try {
    const outputs = JSON.parse(readFileSync('amplify_outputs.json', 'utf8'));
    const apiUrl = outputs.data?.url || '';
    // Extract the API ID from the URL
    const apiMatch = apiUrl.match(/\/\/([^.]+)\./);
    if (!apiMatch) throw new Error('Cannot extract API ID');
  } catch {
    // Fall through to discovery
  }

  // Use known table names from `aws dynamodb list-tables`
  return {
    voice: 'VoiceRecord-qye3mrxz5rcfjpgw4uebq6emfi-NONE',
    provider: 'ProviderRecord-qye3mrxz5rcfjpgw4uebq6emfi-NONE',
  };
}

// ─── DynamoDB client ───
const rawClient = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// ─── Load data ───

function loadVoices() {
  const raw = JSON.parse(readFileSync(VOICES_PATH, 'utf8'));
  const voices = raw.voices ?? (Array.isArray(raw) ? raw : []);
  console.log(`📦 Loaded ${voices.length} voices from ${VOICES_PATH}`);
  return voices;
}

function loadProviders() {
  const source = readFileSync(PROVIDERS_PATH, 'utf8');
  const providers = [];
  const objRegex = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*type:\s*'([^']+)'(?:,\s*websiteUrl:\s*'([^']+)')?\s*\}/g;
  let m;
  while ((m = objRegex.exec(source)) !== null) {
    providers.push({ id: m[1], name: m[2], type: m[3], websiteUrl: m[4] || null });
  }
  console.log(`📦 Loaded ${providers.length} providers from ${PROVIDERS_PATH}`);
  return providers;
}

// ─── Seed providers ───

async function seedProviders(tableName, providers, voiceCounts) {
  console.log(`\n🏭 Seeding ${providers.length} providers → ${tableName}`);
  let created = 0, skipped = 0;

  for (const p of providers) {
    const now = new Date().toISOString();
    const item = {
      id: p.id,
      name: p.name,
      slug: p.id,
      type: p.type || 'other',
      websiteUrl: p.websiteUrl || null,
      description: null,
      colorHex: null,
      voiceCount: voiceCounts[p.id] || 0,
      status: 'active',
      createdAtIso: now,
      updatedAtIso: now,
      // Amplify auto-fields
      createdAt: now,
      updatedAt: now,
      __typename: 'ProviderRecord',
    };

    if (!FORCE) {
      try {
        const existing = await ddb.send(new GetCommand({
          TableName: tableName,
          Key: { id: p.id },
        }));
        if (existing.Item) {
          skipped++;
          continue;
        }
      } catch { /* doesn't exist */ }
    }

    await ddb.send(new PutCommand({ TableName: tableName, Item: item }));
    created++;
  }

  console.log(`  ✅ Providers: ${created} created, ${skipped} skipped`);
}

// ─── Seed voices (batch write, 25 at a time) ───

async function seedVoices(tableName, voices) {
  console.log(`\n🎤 Seeding ${voices.length} voices → ${tableName}`);
  let created = 0, skipped = 0, errors = 0;

  // If not forcing, check which already exist
  const existingIds = new Set();
  if (!FORCE) {
    // Sample check — for 550 items, individual GetItem is fine
    const checkBatch = async (batch) => {
      await Promise.all(batch.map(async (v) => {
        try {
          const existing = await ddb.send(new GetCommand({
            TableName: tableName,
            Key: { id: v.id },
            ProjectionExpression: 'id',
          }));
          if (existing.Item) existingIds.add(v.id);
        } catch { /* doesn't exist */ }
      }));
    };

    // Check in batches of 50
    for (let i = 0; i < voices.length; i += 50) {
      await checkBatch(voices.slice(i, i + 50));
      process.stdout.write(`  Checking existing: ${Math.min(i + 50, voices.length)}/${voices.length}\r`);
    }
    console.log(`  Found ${existingIds.size} existing records`);
  }

  // Filter to new voices only
  const toWrite = FORCE ? voices : voices.filter(v => !existingIds.has(v.id));
  skipped = voices.length - toWrite.length;

  if (toWrite.length === 0) {
    console.log(`  ✅ All ${voices.length} voices already exist, nothing to seed.`);
    return;
  }

  // BatchWrite in groups of 25 (DynamoDB limit)
  for (let i = 0; i < toWrite.length; i += 25) {
    const batch = toWrite.slice(i, i + 25);
    const now = new Date().toISOString();

    const requests = batch.map(v => ({
      PutRequest: {
        Item: {
          id: v.id,
          name: v.name,
          provider: v.provider,
          providerId: v.providerId || '',
          providerVoiceId: v.providerVoiceId || null,
          description: v.description,
          tags: v.tags || [],
          languages: v.languages || [],
          qualityTier: v.qualityTier || 'standard',
          licenseNotes: v.licenseNotes || '',
          metadata: v.metadata || {},
          modelCard: v.modelCard || null,
          imageUrl: v.imageUrl || null,
          audioUrl: v.audioUrl || null,
          samples: v.samples || [],
          variants: v.variants || [],
          status: 'published',
          createdAtIso: now,
          updatedAtIso: now,
          createdAt: now,
          updatedAt: now,
          __typename: 'VoiceRecord',
        }
      }
    }));

    try {
      const result = await ddb.send(new BatchWriteCommand({
        RequestItems: { [tableName]: requests },
      }));

      // Handle unprocessed items
      const unprocessed = result.UnprocessedItems?.[tableName]?.length || 0;
      created += batch.length - unprocessed;
      if (unprocessed > 0) {
        errors += unprocessed;
        console.warn(`  ⚠️  ${unprocessed} unprocessed items at batch ${i}`);
      }
    } catch (err) {
      console.error(`  ❌ Batch ${i}: ${err.message.slice(0, 100)}`);
      errors += batch.length;
    }

    const done = Math.min(i + 25, toWrite.length);
    process.stdout.write(`  Writing: ${done}/${toWrite.length}\r`);
  }

  console.log(`\n  ✅ Voices: ${created} created, ${skipped} skipped, ${errors} errors`);
}

// ─── Main ───

async function main() {
  const tables = resolveTableNames();
  const voices = loadVoices();
  const providers = loadProviders();

  const voiceCounts = {};
  for (const v of voices) {
    const pid = v.providerId || 'unknown';
    voiceCounts[pid] = (voiceCounts[pid] || 0) + 1;
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Voices:    ${voices.length}`);
  console.log(`  Providers: ${providers.length}`);
  console.log(`  Tables:    ${tables.voice}, ${tables.provider}`);
  console.log(`  Mode:      ${DRY_RUN ? 'DRY RUN' : FORCE ? 'FORCE (overwrite)' : 'CREATE (skip existing)'}`);

  if (DRY_RUN) {
    console.log('\n🏃 Dry run — no writes performed.');
    for (const p of providers) {
      console.log(`  ${p.name.padEnd(22)} ${(voiceCounts[p.id] || 0).toString().padStart(4)}`);
    }
    return;
  }

  await seedProviders(tables.provider, providers, voiceCounts);
  await seedVoices(tables.voice, voices);

  console.log('\n✅ Seeding complete!');
}

main().catch(e => {
  console.error('❌', e);
  process.exit(1);
});
