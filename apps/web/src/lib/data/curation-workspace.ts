import { DEFAULT_PROVIDERS } from '$lib/providers';
import type { ProviderDefinition, Voice } from '$lib/types';
import type { VoiceMetadataPatch } from '$lib/voice-catalog';
import { dataClient } from '$lib/data/client';

const WORKSPACE_KEY = 'global';

type CurationWorkspaceRecord = {
  id: string;
  key: string;
  metadataOverrides: unknown;
  customVoices: unknown;
  providerCatalog: unknown;
  published?: boolean | null;
};

type WorkspaceListResponse = {
  data: CurationWorkspaceRecord[];
  errors?: unknown;
};

function assertNoErrors(errors: unknown) {
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error('Amplify data request failed.');
  }
}

function safeObject(input: unknown): Record<string, VoiceMetadataPatch> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input as Record<string, VoiceMetadataPatch>;
}

function safeVoices(input: unknown): Voice[] {
  if (!Array.isArray(input)) return [];
  return input.filter((entry): entry is Voice => Boolean(entry) && typeof entry === 'object');
}

function safeProviders(input: unknown): ProviderDefinition[] {
  if (!Array.isArray(input)) return DEFAULT_PROVIDERS;

  const providers = input.filter(
    (entry): entry is ProviderDefinition =>
      Boolean(entry) &&
      typeof entry === 'object' &&
      typeof (entry as ProviderDefinition).id === 'string' &&
      typeof (entry as ProviderDefinition).name === 'string'
  );

  if (!providers.length) return DEFAULT_PROVIDERS;
  return providers;
}

async function fetchWorkspaceRecord(): Promise<CurationWorkspaceRecord | null> {
  const client = dataClient();

  const load = async (authMode?: 'apiKey' | 'userPool') => {
    const response = (await client.models.CurationWorkspace.list(
      {
        limit: 1,
        filter: { key: { eq: WORKSPACE_KEY } },
        ...(authMode ? { authMode } : {})
      }
    )) as WorkspaceListResponse;

    assertNoErrors(response.errors);
    return response.data.find(Boolean) ?? null;
  };

  try {
    return await load();
  } catch {
    return load('apiKey');
  }
}

export async function fetchCurationWorkspace(): Promise<{
  metadataOverrides: Record<string, VoiceMetadataPatch>;
  customVoices: Voice[];
  providerCatalog: ProviderDefinition[];
}> {
  const record = await fetchWorkspaceRecord();

  if (!record) {
    return {
      metadataOverrides: {},
      customVoices: [],
      providerCatalog: DEFAULT_PROVIDERS
    };
  }

  return {
    metadataOverrides: safeObject(record.metadataOverrides),
    customVoices: safeVoices(record.customVoices),
    providerCatalog: safeProviders(record.providerCatalog)
  };
}

export async function saveCurationWorkspace(payload: {
  metadataOverrides: Record<string, VoiceMetadataPatch>;
  customVoices: Voice[];
  providerCatalog: ProviderDefinition[];
}) {
  const client = dataClient();
  const existing = await fetchWorkspaceRecord();

  if (!existing) {
    const created = await client.models.CurationWorkspace.create({
      key: WORKSPACE_KEY,
      metadataOverrides: payload.metadataOverrides,
      customVoices: payload.customVoices,
      providerCatalog: payload.providerCatalog,
      updatedAtIso: new Date().toISOString(),
      published: true
    });
    assertNoErrors(created.errors);
    return;
  }

  const updated = await client.models.CurationWorkspace.update({
    id: existing.id,
    metadataOverrides: payload.metadataOverrides,
    customVoices: payload.customVoices,
    providerCatalog: payload.providerCatalog,
    updatedAtIso: new Date().toISOString(),
    published: existing.published ?? true
  });
  assertNoErrors(updated.errors);
}
