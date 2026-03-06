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
      qualityTier: 'standard' as const,
      licenseNotes: '',
      metadata: { shortLabel: '', searchDescription: '', machineTags: [], useCases: [], toneTags: [], audienceTags: [], metadataQuality: 'sparse' as const },
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
      qualityTier: 'standard' as const,
      licenseNotes: '',
      metadata: { shortLabel: '', searchDescription: '', machineTags: [], useCases: [], toneTags: [], audienceTags: [], metadataQuality: 'sparse' as const },
      samples: [],
      variants: [],
      status: 'published' as const,
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

// ─── 9. BYOK Synthesis — schema and infrastructure tests ───

describe('BYOK Synthesis — Amplify Schema', () => {
  const schemaPath = resolve(__dirname, '../../../../../amplify/data/resource.ts');
  const schema = readFileSync(schemaPath, 'utf8');

  it('defines UserProviderCredential model', () => {
    expect(schema).toContain('UserProviderCredential:');
  });

  it('UserProviderCredential has required fields', () => {
    const block = schema.slice(
      schema.indexOf('UserProviderCredential:'),
      schema.indexOf('.authorization', schema.indexOf('UserProviderCredential:'))
    );
    expect(block).toContain('providerId: a.string().required()');
    expect(block).toContain('label: a.string().required()');
    expect(block).toContain('credentialData: a.string().required()');
    expect(block).toContain("status: a.enum(['active', 'invalid', 'expired'])");
  });

  it('UserProviderCredential has owner-only auth', () => {
    const modelSection = schema.slice(
      schema.indexOf('UserProviderCredential:'),
      schema.indexOf(',\n\n', schema.indexOf('UserProviderCredential:')) + 3
    );
    expect(modelSection).toContain('allow.owner()');
  });

  it('defines SynthesisJob model', () => {
    expect(schema).toContain('SynthesisJob:');
  });

  it('SynthesisJob has required fields', () => {
    const block = schema.slice(
      schema.indexOf('SynthesisJob:'),
      schema.indexOf('.authorization', schema.indexOf('SynthesisJob:'))
    );
    expect(block).toContain('voiceId: a.string().required()');
    expect(block).toContain('providerId: a.string().required()');
    expect(block).toContain('inputText: a.string().required()');
    expect(block).toContain("inputMode: a.enum(['text', 'ssml'])");
    expect(block).toContain("status: a.enum(['pending', 'completed', 'failed'])");
  });

  it('SynthesisJob has owner-only auth', () => {
    const modelSection = schema.slice(
      schema.indexOf('SynthesisJob:'),
      schema.indexOf(',\n\n', schema.indexOf('SynthesisJob:')) + 3
    );
    expect(modelSection).toContain('allow.owner()');
  });
});

describe('BYOK Synthesis — Provider Auth Config', () => {
  it('provider-auth.ts exports auth configs for cloud providers', async () => {
    const filePath = resolve(__dirname, '../synthesis/provider-auth.ts');
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, 'utf8');
    expect(content).toContain('PROVIDER_AUTH_CONFIGS');
    expect(content).toContain("providerId: 'openai'");
    expect(content).toContain("providerId: 'elevenlabs'");
    expect(content).toContain("providerId: 'deepgram'");
    expect(content).toContain("providerId: 'cartesia'");
    expect(content).toContain("providerId: 'lmnt'");
    expect(content).toContain("providerId: 'aws-polly'");
    expect(content).toContain("providerId: 'azure-speech'");
    expect(content).toContain("providerId: 'gcp-tts'");
    expect(content).toContain("providerId: 'gemini-tts'");
    expect(content).toContain("providerId: 'edge-tts'");
  });

  it('defines free and credential-required providers', async () => {
    const filePath = resolve(__dirname, '../synthesis/provider-auth.ts');
    const content = readFileSync(filePath, 'utf8');
    expect(content).toContain("authType: 'api_key'");
    expect(content).toContain("authType: 'aws_credentials'");
    expect(content).toContain("authType: 'subscription_key'");
    expect(content).toContain("authType: 'none'");
  });
});

describe('BYOK Synthesis — Real Adapters', () => {
  const adapters = [
    { name: 'openai', file: 'openai.ts', factory: 'createOpenAIAdapter' },
    { name: 'elevenlabs', file: 'elevenlabs-real.ts', factory: 'createElevenLabsAdapter' },
    { name: 'deepgram', file: 'deepgram-real.ts', factory: 'createDeepgramAdapter' },
    { name: 'cartesia', file: 'cartesia-real.ts', factory: 'createCartesiaAdapter' },
    { name: 'lmnt', file: 'lmnt-real.ts', factory: 'createLmntAdapter' },
    { name: 'azure-speech', file: 'azure-speech-real.ts', factory: 'createAzureSpeechAdapter' },
    { name: 'gcp-tts', file: 'gcp-tts-real.ts', factory: 'createGcpTtsAdapter' },
    { name: 'gemini-tts', file: 'gemini-tts-real.ts', factory: 'createGeminiTtsAdapter' },
    { name: 'aws-polly', file: 'aws-polly-real.ts', factory: 'createAwsPollyAdapter' },
  ];

  for (const { name, file, factory } of adapters) {
    it(`${name} adapter exists and exports factory`, () => {
      const filePath = resolve(__dirname, `../synthesis/adapters/${file}`);
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf8');
      expect(content).toContain(`export function ${factory}`);
      expect(content).toContain('synthesizePreview');
      expect(content).toContain('URL.createObjectURL');
    });
  }
});

describe('BYOK Synthesis — Credential Store', () => {
  it('credential-store.ts exports CRUD functions', () => {
    const filePath = resolve(__dirname, 'credential-store.ts');
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, 'utf8');
    expect(content).toContain('export async function listCredentials');
    expect(content).toContain('export async function getCredentialData');
    expect(content).toContain('export async function saveCredential');
    expect(content).toContain('export async function deleteCredential');
    expect(content).toContain('export async function hasCredentialFor');
  });
});

describe('BYOK Synthesis — Registry', () => {
  it('registry supports credential-backed adapters', () => {
    const filePath = resolve(__dirname, '../synthesis/registry.ts');
    const content = readFileSync(filePath, 'utf8');
    expect(content).toContain('registerCredentialAdapter');
    expect(content).toContain('unregisterCredentialAdapter');
    expect(content).toContain('clearCredentialAdapters');
    expect(content).toContain('hasRealAdapter');
    expect(content).toContain('getConnectedProviders');
    expect(content).toContain('getProviderForVariant');
  });
});

describe('BYOK Synthesis — OAuth Infrastructure', () => {
  it('oauth.ts exports Google and Microsoft sign-in', () => {
    const filePath = resolve(__dirname, '../synthesis/oauth.ts');
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, 'utf8');
    expect(content).toContain('export async function signInWithGoogle');
    expect(content).toContain('export async function signInWithMicrosoft');
    expect(content).toContain('export async function oauthSignIn');
    expect(content).toContain('export async function oauthSignOut');
    expect(content).toContain('export function getOAuthToken');
    expect(content).toContain('export function hasValidOAuthToken');
    expect(content).toContain('export function getAccessTokenForProvider');
  });

  it('oauth.ts defines configs for Google and Microsoft', () => {
    const filePath = resolve(__dirname, '../synthesis/oauth.ts');
    const content = readFileSync(filePath, 'utf8');
    expect(content).toContain("provider: 'google'");
    expect(content).toContain("provider: 'microsoft'");
    expect(content).toContain("coversProviders: ['gcp-tts', 'gemini-tts']");
    expect(content).toContain("coversProviders: ['azure-speech']");
  });

  it('provider-auth configs include OAuth options for Google and Microsoft providers', () => {
    const filePath = resolve(__dirname, '../synthesis/provider-auth.ts');
    const content = readFileSync(filePath, 'utf8');
    // GCP TTS, Gemini TTS, and Azure Speech should have oauth options
    expect(content).toContain("provider: 'google'");
    expect(content).toContain("provider: 'microsoft'");
    expect(content).toContain("buttonLabel: 'Sign in with Google'");
    expect(content).toContain("buttonLabel: 'Sign in with Microsoft'");
  });

  it('real adapters check for OAuth tokens', () => {
    const gcpAdapter = readFileSync(resolve(__dirname, '../synthesis/adapters/gcp-tts-real.ts'), 'utf8');
    expect(gcpAdapter).toContain('getAccessTokenForProvider');
    expect(gcpAdapter).toContain('oauthToken');

    const geminiAdapter = readFileSync(resolve(__dirname, '../synthesis/adapters/gemini-tts-real.ts'), 'utf8');
    expect(geminiAdapter).toContain('getAccessTokenForProvider');
    expect(geminiAdapter).toContain('oauthToken');

    const azureAdapter = readFileSync(resolve(__dirname, '../synthesis/adapters/azure-speech-real.ts'), 'utf8');
    expect(azureAdapter).toContain('getAccessTokenForProvider');
    expect(azureAdapter).toContain('oauthToken');
  });

  it('registry checks OAuth tokens in hasRealAdapter', () => {
    const registry = readFileSync(resolve(__dirname, '../synthesis/registry.ts'), 'utf8');
    expect(registry).toContain('hasValidOAuthToken');
  });
});

describe('BYOK Synthesis — Account Providers Page', () => {
  it('account/providers page exists', () => {
    const pagePath = resolve(__dirname, '../../routes/account/providers/+page.svelte');
    expect(existsSync(pagePath)).toBe(true);
    const content = readFileSync(pagePath, 'utf8');
    expect(content).toContain('Provider API Keys');
    expect(content).toContain('connectProvider');
    expect(content).toContain('disconnectProvider');
    expect(content).toContain('testCredential');
    expect(content).toContain('Cloud Providers');
    expect(content).toContain('Free Providers');
  });

  it('providers page supports save and remove actions', () => {
    const pagePath = resolve(__dirname, '../../routes/account/providers/+page.svelte');
    const content = readFileSync(pagePath, 'utf8');
    expect(content).toContain('handleSave');
    expect(content).toContain('handleRemove');
    expect(content).toContain('handleTest');
    expect(content).toContain('Save Key');
    expect(content).toContain('Test Connection');
  });

  it('vokda api-keys page exists', () => {
    const pagePath = resolve(__dirname, '../../routes/account/api-keys/+page.svelte');
    expect(existsSync(pagePath)).toBe(true);
    const content = readFileSync(pagePath, 'utf8');
    expect(content).toContain('Vokda API Keys');
    expect(content).toContain('Create Key');
    expect(content).toContain('revokeKey');
    expect(content).toContain('/v1/keys');
  });
});
