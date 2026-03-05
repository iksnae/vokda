import { generateClient } from 'aws-amplify/api';
import { ensureAmplifyConfigured } from '$lib/auth/amplify-client';
import type { Voice } from '$lib/types';
import type { VoiceMetadataPatch } from '$lib/voice-catalog';

const WORKSPACE_KEY = 'global';

type CurationWorkspaceRecord = {
  id: string;
  key: string;
  metadataOverrides: unknown;
  customVoices: unknown;
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
}> {
  const record = await fetchWorkspaceRecord();

  if (!record) {
    return {
      metadataOverrides: {},
      customVoices: []
    };
  }

  return {
    metadataOverrides: safeObject(record.metadataOverrides),
    customVoices: safeVoices(record.customVoices)
  };
}

export async function saveCurationWorkspace(payload: {
  metadataOverrides: Record<string, VoiceMetadataPatch>;
  customVoices: Voice[];
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
        updatedAtIso: new Date().toISOString(),
        published: existing.published ?? true
      }
    }
  });
}
