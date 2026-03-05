import { generateClient } from 'aws-amplify/api';
import { ensureAmplifyConfigured } from '$lib/auth/amplify-client';
import { DEFAULT_PROVIDERS } from '$lib/providers';
import type { ProviderDefinition, Voice } from '$lib/types';
import type { VoiceMetadataPatch } from '$lib/voice-catalog';

const WORKSPACE_KEY = 'global';

type CurationWorkspaceRecord = {
  id: string;
  key: string;
  metadataOverrides: unknown;
  customVoices: unknown;
  providerCatalog: unknown;
  updatedAtIso: string;
  published?: boolean | null;
};

const listWorkspaceQuery = /* GraphQL */ `
  query ListCurationWorkspaces($filter: ModelCurationWorkspaceFilterInput, $limit: Int) {
    listCurationWorkspaces(filter: $filter, limit: $limit) {
      items {
        id
        key
        metadataOverrides
        customVoices
        providerCatalog
        updatedAtIso
        published
      }
    }
  }
`;

const createWorkspaceMutation = /* GraphQL */ `
  mutation CreateCurationWorkspace($input: CreateCurationWorkspaceInput!) {
    createCurationWorkspace(input: $input) {
      id
    }
  }
`;

const updateWorkspaceMutation = /* GraphQL */ `
  mutation UpdateCurationWorkspace($input: UpdateCurationWorkspaceInput!) {
    updateCurationWorkspace(input: $input) {
      id
    }
  }
`;

function client() {
  ensureAmplifyConfigured();
  return generateClient();
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
  const gqlClient = client();

  const response = (await gqlClient.graphql({
    query: listWorkspaceQuery,
    variables: {
      limit: 1,
      filter: {
        key: { eq: WORKSPACE_KEY }
      }
    }
  })) as {
    data?: { listCurationWorkspaces?: { items?: Array<CurationWorkspaceRecord | null> | null } };
  };

  const item = response.data?.listCurationWorkspaces?.items?.find(Boolean);
  return item ?? null;
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
  const gqlClient = client();
  const existing = await fetchWorkspaceRecord();

  if (!existing) {
    await gqlClient.graphql({
      query: createWorkspaceMutation,
      variables: {
        input: {
          key: WORKSPACE_KEY,
          metadataOverrides: payload.metadataOverrides,
          customVoices: payload.customVoices,
          providerCatalog: payload.providerCatalog,
          updatedAtIso: new Date().toISOString(),
          published: true
        }
      }
    });

    return;
  }

  await gqlClient.graphql({
    query: updateWorkspaceMutation,
    variables: {
      input: {
        id: existing.id,
        metadataOverrides: payload.metadataOverrides,
        customVoices: payload.customVoices,
        providerCatalog: payload.providerCatalog,
        updatedAtIso: new Date().toISOString(),
        published: existing.published ?? true
      }
    }
  });
}
