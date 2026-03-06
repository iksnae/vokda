import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ─── 1. Amplify Schema — structural tests ───

describe('Amplify Schema — VoiceRecord & ProviderRecord', () => {
  const schemaPath = resolve(__dirname, '../../../../../amplify/data/resource.ts');
  const schema = readFileSync(schemaPath, 'utf8');

  it('defines VoiceRecord model', () => {
    expect(schema).toContain('VoiceRecord:');
  });

  it('VoiceRecord has required fields', () => {
    // Extract the VoiceRecord block (up to next model or end)
    const voiceBlock = schema.slice(
      schema.indexOf('VoiceRecord:'),
      schema.indexOf('.authorization', schema.indexOf('VoiceRecord:'))
    );
    expect(voiceBlock).toContain('name: a.string().required()');
    expect(voiceBlock).toContain('provider: a.string().required()');
    expect(voiceBlock).toContain('providerId: a.string().required()');
    expect(voiceBlock).toContain('description: a.string().required()');
    expect(voiceBlock).toContain('tags: a.string().array().required()');
    expect(voiceBlock).toContain('languages: a.string().array().required()');
    expect(voiceBlock).toContain('metadata: a.json().required()');
    expect(voiceBlock).toContain('status:');
    expect(voiceBlock).toContain('createdAtIso: a.string().required()');
    expect(voiceBlock).toContain('updatedAtIso: a.string().required()');
  });

  it('VoiceRecord has optional fields', () => {
    const voiceBlock = schema.slice(
      schema.indexOf('VoiceRecord:'),
      schema.indexOf('.authorization', schema.indexOf('VoiceRecord:'))
    );
    expect(voiceBlock).toContain('providerVoiceId:');
    expect(voiceBlock).toContain('modelCard:');
    expect(voiceBlock).toContain('imageUrl:');
    expect(voiceBlock).toContain('audioUrl:');
    expect(voiceBlock).toContain('samples:');
    expect(voiceBlock).toContain('variants:');
  });

  it('VoiceRecord has correct authorization (curator+admin write, public read)', () => {
    const afterVoice = schema.slice(schema.indexOf('VoiceRecord:'));
    // Find the authorization block — it ends at the next model definition or end
    const nextModel = afterVoice.indexOf('\n\n  ', 10);
    const authBlock = nextModel > 0 ? afterVoice.slice(0, nextModel) : afterVoice;
    expect(authBlock).toContain('curator');
    expect(authBlock).toContain('admin');
    expect(authBlock).toContain('publicApiKey');
  });

  it('defines ProviderRecord model', () => {
    expect(schema).toContain('ProviderRecord:');
  });

  it('ProviderRecord has required fields', () => {
    const providerBlock = schema.slice(
      schema.indexOf('ProviderRecord:'),
      schema.indexOf('.authorization', schema.indexOf('ProviderRecord:'))
    );
    expect(providerBlock).toContain('name: a.string().required()');
    expect(providerBlock).toContain('slug: a.string().required()');
    expect(providerBlock).toContain('type:');
    expect(providerBlock).toContain('createdAtIso: a.string().required()');
    expect(providerBlock).toContain('updatedAtIso: a.string().required()');
  });

  it('ProviderRecord has optional fields', () => {
    const providerBlock = schema.slice(
      schema.indexOf('ProviderRecord:'),
      schema.indexOf('.authorization', schema.indexOf('ProviderRecord:'))
    );
    expect(providerBlock).toContain('websiteUrl:');
    expect(providerBlock).toContain('description:');
    expect(providerBlock).toContain('colorHex:');
    expect(providerBlock).toContain('voiceCount:');
  });
});

// ─── 2. Types — compile-time correctness ───

describe('Types — VoiceRecord, ProviderRecord', () => {
  it('types.ts exports VoiceRecord type', () => {
    const typesPath = resolve(__dirname, '../types.ts');
    const types = readFileSync(typesPath, 'utf8');
    expect(types).toContain('export type VoiceRecord');
  });

  it('VoiceRecord extends Voice with status and timestamps', () => {
    const typesPath = resolve(__dirname, '../types.ts');
    const types = readFileSync(typesPath, 'utf8');
    // Should have status field with draft/published/archived
    expect(types).toMatch(/VoiceRecord[\s\S]*status.*'draft'.*'published'.*'archived'/);
    expect(types).toMatch(/VoiceRecord[\s\S]*createdAt.*string/);
    expect(types).toMatch(/VoiceRecord[\s\S]*updatedAt.*string/);
  });

  it('types.ts exports ProviderRecord type', () => {
    const typesPath = resolve(__dirname, '../types.ts');
    const types = readFileSync(typesPath, 'utf8');
    expect(types).toContain('export type ProviderRecord');
  });

  it('ProviderRecord extends ProviderDefinition with status and timestamps', () => {
    const typesPath = resolve(__dirname, '../types.ts');
    const types = readFileSync(typesPath, 'utf8');
    expect(types).toMatch(/ProviderRecord[\s\S]*status.*'active'.*'inactive'/);
    expect(types).toMatch(/ProviderRecord[\s\S]*voiceCount.*number/);
  });

  it('types.ts exports SynthesisJob type', () => {
    const typesPath = resolve(__dirname, '../types.ts');
    const types = readFileSync(typesPath, 'utf8');
    expect(types).toContain('export type SynthesisJob');
  });

  it('types.ts exports UserProviderCredential type', () => {
    const typesPath = resolve(__dirname, '../types.ts');
    const types = readFileSync(typesPath, 'utf8');
    expect(types).toContain('export type UserProviderCredential');
  });
});

// ─── 3. CDN Helper ───

describe('CDN Helper — audioUrl()', () => {
  it('cdn.ts module exists', () => {
    const cdnPath = resolve(__dirname, '../audio/cdn.ts');
    expect(existsSync(cdnPath)).toBe(true);
  });

  it('exports audioUrl function', async () => {
    const mod = await import('../audio/cdn');
    expect(typeof mod.audioUrl).toBe('function');
  });

  it('returns static fallback path when no base URL configured', async () => {
    const mod = await import('../audio/cdn');
    const url = mod.audioUrl('01JCVK5F2Q2W5P4TQ8KT4NR1A1');
    // When PUBLIC_AUDIO_BASE_URL is not set (test env), should return static path
    expect(url).toContain('01JCVK5F2Q2W5P4TQ8KT4NR1A1');
    expect(url).toContain('.mp3');
  });

  it('exports audioUrlWithBase for explicit base URL usage', async () => {
    const mod = await import('../audio/cdn');
    expect(typeof mod.audioUrlWithBase).toBe('function');
  });

  it('audioUrlWithBase returns S3 URL when base is provided', async () => {
    const mod = await import('../audio/cdn');
    const url = mod.audioUrlWithBase('https://s3.example.com/audio', 'VOICE123');
    expect(url).toBe('https://s3.example.com/audio/catalog/VOICE123.mp3');
  });

  it('audioUrlWithBase returns static fallback when base is empty', async () => {
    const mod = await import('../audio/cdn');
    const url = mod.audioUrlWithBase('', 'VOICE123');
    expect(url).toBe('/audio/samples/VOICE123.mp3');
  });
});

// ─── 4. Voice Store — mapping functions ───

describe('Voice Store — record mapping', () => {
  it('voice-store.ts module exists', () => {
    const storePath = resolve(__dirname, './voice-store.ts');
    expect(existsSync(storePath)).toBe(true);
  });

  it('exports voiceToRecord mapping function', async () => {
    const mod = await import('./voice-store');
    expect(typeof mod.voiceToRecord).toBe('function');
  });

  it('exports recordToVoice mapping function', async () => {
    const mod = await import('./voice-store');
    expect(typeof mod.recordToVoice).toBe('function');
  });

  it('exports providerToRecord mapping function', async () => {
    const mod = await import('./voice-store');
    expect(typeof mod.providerToRecord).toBe('function');
  });

  it('exports recordToProvider mapping function', async () => {
    const mod = await import('./voice-store');
    expect(typeof mod.recordToProvider).toBe('function');
  });

  it('voiceToRecord adds status and timestamps', async () => {
    const { voiceToRecord } = await import('./voice-store');
    const voice = {
      id: 'test-1',
      name: 'Test Voice',
      provider: 'TestProvider',
      providerId: 'test-provider',
      description: 'A test voice',
      tags: ['test'],
      languages: ['en-US'],
      qualityTier: 'standard' as const,
      licenseNotes: 'MIT',
      metadata: {
        shortLabel: 'Test',
        searchDescription: '',
        machineTags: [],
        useCases: [],
        toneTags: [],
        audienceTags: [],
        metadataQuality: 'sparse' as const,
      },
      samples: [],
      variants: [],
    };
    const record = voiceToRecord(voice);
    expect(record.status).toBe('published');
    expect(record.createdAt).toBeDefined();
    expect(record.updatedAt).toBeDefined();
    expect(record.name).toBe('Test Voice');
    expect(record.id).toBe('test-1');
  });

  it('recordToVoice strips status and timestamps', async () => {
    const { recordToVoice } = await import('./voice-store');
    const record = {
      id: 'test-1',
      name: 'Test Voice',
      provider: 'TestProvider',
      providerId: 'test-provider',
      description: 'A test voice',
      tags: ['test'],
      languages: ['en-US'],
      qualityTier: 'standard' as const,
      licenseNotes: 'MIT',
      metadata: {
        shortLabel: 'Test',
        searchDescription: '',
        machineTags: [],
        useCases: [],
        toneTags: [],
        audienceTags: [],
        metadataQuality: 'sparse' as const,
      },
      samples: [],
      variants: [],
      status: 'published' as const,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const voice = recordToVoice(record);
    expect(voice.name).toBe('Test Voice');
    expect(voice.id).toBe('test-1');
    expect((voice as Record<string, unknown>)['status']).toBeUndefined();
    expect((voice as Record<string, unknown>)['createdAt']).toBeUndefined();
    expect((voice as Record<string, unknown>)['updatedAt']).toBeUndefined();
  });

  it('providerToRecord adds status and timestamps', async () => {
    const { providerToRecord } = await import('./voice-store');
    const provider = {
      id: 'aws-polly',
      name: 'AWS Polly',
      type: 'cloud_provider' as const,
      websiteUrl: 'https://aws.amazon.com/polly/',
    };
    const record = providerToRecord(provider, 18);
    expect(record.status).toBe('active');
    expect(record.voiceCount).toBe(18);
    expect(record.slug).toBe('aws-polly');
    expect(record.createdAt).toBeDefined();
    expect(record.updatedAt).toBeDefined();
  });

  it('recordToProvider strips record fields', async () => {
    const { recordToProvider } = await import('./voice-store');
    const record = {
      id: 'r-1',
      slug: 'aws-polly',
      name: 'AWS Polly',
      type: 'cloud_provider' as const,
      websiteUrl: 'https://aws.amazon.com/polly/',
      voiceCount: 18,
      status: 'active' as const,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const provider = recordToProvider(record);
    expect(provider.id).toBe('aws-polly');
    expect(provider.name).toBe('AWS Polly');
    expect(provider.type).toBe('cloud_provider');
    expect((provider as Record<string, unknown>)['status']).toBeUndefined();
    expect((provider as Record<string, unknown>)['voiceCount']).toBeUndefined();
  });
});

// ─── 5. Publish Script Logic ───

describe('Publish catalog — JSON shape', () => {
  it('voices.json has { voices: [...] } wrapper', () => {
    const voicesPath = resolve(__dirname, '../../../static/data/voices.json');
    const raw = JSON.parse(readFileSync(voicesPath, 'utf8'));
    expect(raw).toHaveProperty('voices');
    expect(Array.isArray(raw.voices)).toBe(true);
    expect(raw.voices.length).toBeGreaterThan(0);
  });

  it('every voice has required fields', () => {
    const voicesPath = resolve(__dirname, '../../../static/data/voices.json');
    const { voices } = JSON.parse(readFileSync(voicesPath, 'utf8'));
    for (const v of voices) {
      expect(v.id).toBeDefined();
      expect(v.name).toBeDefined();
      expect(v.provider).toBeDefined();
      expect(v.description).toBeDefined();
      expect(Array.isArray(v.tags)).toBe(true);
      expect(Array.isArray(v.languages)).toBe(true);
    }
  });

  it('publish-catalog.mjs script exists', () => {
    const scriptPath = resolve(__dirname, '../../../../../scripts/publish-catalog.mjs');
    expect(existsSync(scriptPath)).toBe(true);
  });
});

// ─── 6. Catalog Loader ───

describe('Catalog Loader', () => {
  it('catalog.ts exports loadCatalog', async () => {
    const mod = await import('../catalog');
    expect(typeof mod.loadCatalog).toBe('function');
  });

  it('catalog.ts exports loadVoiceById', async () => {
    const mod = await import('../catalog');
    expect(typeof mod.loadVoiceById).toBe('function');
  });

  it('catalog.ts exports resetCatalogCache', async () => {
    const mod = await import('../catalog');
    expect(typeof mod.resetCatalogCache).toBe('function');
  });
});

// ─── 7. Build size ───

describe('Build artifact constraints', () => {
  it('amplify storage resource exists', () => {
    const storagePath = resolve(__dirname, '../../../../../amplify/storage/resource.ts');
    expect(existsSync(storagePath)).toBe(true);
  });

  it('amplify backend registers storage', () => {
    const backendPath = resolve(__dirname, '../../../../../amplify/backend.ts');
    const backend = readFileSync(backendPath, 'utf8');
    expect(backend).toContain('storage');
  });
});

// ─── 8. Seed script ───

describe('Seed script', () => {
  it('seed-dynamodb.mjs exists', () => {
    const seedPath = resolve(__dirname, '../../../../../scripts/seed-dynamodb.mjs');
    expect(existsSync(seedPath)).toBe(true);
  });

  it('seed script uses DynamoDB SDK BatchWriteCommand', () => {
    const seedPath = resolve(__dirname, '../../../../../scripts/seed-dynamodb.mjs');
    const script = readFileSync(seedPath, 'utf8');
    expect(script).toContain('BatchWriteCommand');
    expect(script).toContain('@aws-sdk/lib-dynamodb');
    expect(script).toContain('VoiceRecord');
    expect(script).toContain('ProviderRecord');
  });
});

// ─── 9. Voice Store CRUD ───

describe('Voice Store module', () => {
  it('exports mapping functions', async () => {
    const mod = await import('./voice-store');
    expect(typeof mod.voiceToRecord).toBe('function');
    expect(typeof mod.recordToVoice).toBe('function');
    expect(typeof mod.providerToRecord).toBe('function');
    expect(typeof mod.recordToProvider).toBe('function');
  });

  it('exports CRUD functions', async () => {
    const mod = await import('./voice-store');
    expect(typeof mod.listVoiceRecords).toBe('function');
    expect(typeof mod.getVoiceRecord).toBe('function');
    expect(typeof mod.saveVoiceRecord).toBe('function');
    expect(typeof mod.deleteVoiceRecord).toBe('function');
    expect(typeof mod.listProviderRecords).toBe('function');
    expect(typeof mod.saveProviderRecord).toBe('function');
  });

  it('voiceToRecord adds status and timestamps', async () => {
    const { voiceToRecord } = await import('./voice-store');
    const voice = {
      id: 'test-id',
      name: 'Test',
      provider: 'test',
      description: 'desc',
      tags: [],
      languages: ['en'],
      qualityTier: 'standard',
      licenseNotes: '',
      metadata: { shortLabel: '', searchDescription: '', machineTags: [], useCases: [], toneTags: [], audienceTags: [], metadataQuality: 'sparse' },
      samples: [],
      variants: [],
    };
    const record = voiceToRecord(voice, 'draft');
    expect(record.status).toBe('draft');
    expect(typeof record.createdAt).toBe('string');
    expect(typeof record.updatedAt).toBe('string');
    expect(record.name).toBe('Test');
  });

  it('recordToVoice strips status and timestamps', async () => {
    const { recordToVoice } = await import('./voice-store');
    const record = {
      id: 'test-id',
      name: 'Test',
      provider: 'test',
      description: 'desc',
      tags: [],
      languages: ['en'],
      qualityTier: 'standard',
      licenseNotes: '',
      metadata: { shortLabel: '', searchDescription: '', machineTags: [], useCases: [], toneTags: [], audienceTags: [], metadataQuality: 'sparse' },
      samples: [],
      variants: [],
      status: 'published',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    const voice = recordToVoice(record);
    expect(voice.name).toBe('Test');
    expect('status' in voice).toBe(false);
    expect('createdAt' in voice).toBe(false);
  });
});

// ─── 10. Publish script ───

describe('Publish catalog script', () => {
  it('publish-catalog.mjs supports --from-db flag', () => {
    const scriptPath = resolve(__dirname, '../../../../../scripts/publish-catalog.mjs');
    const script = readFileSync(scriptPath, 'utf8');
    expect(script).toContain('--from-db');
    expect(script).toContain('loadVoicesFromDB');
    expect(script).toContain('listVoiceRecords');
  });

  it('publish-catalog.mjs writes back to voices.json in DB mode', () => {
    const scriptPath = resolve(__dirname, '../../../../../scripts/publish-catalog.mjs');
    const script = readFileSync(scriptPath, 'utf8');
    expect(script).toContain('Wrote');
    expect(script).toContain('voices.json');
  });
});
