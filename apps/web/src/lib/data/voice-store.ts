/**
 * Voice Store — mapping functions and AppSync CRUD for VoiceRecord / ProviderRecord.
 *
 * Mapping functions convert between catalog shape (Voice) and database shape (VoiceRecord).
 * CRUD functions use AppSync via Amplify Data client.
 */

import type {
  Voice,
  VoiceRecord,
  ProviderDefinition,
  ProviderRecord,
} from '$lib/types';
import { dataClient } from '$lib/data/client';

// ─── Pure Mapping Functions ───

/**
 * Convert a Voice (catalog shape) to a VoiceRecord (database shape).
 */
export function voiceToRecord(
  voice: Voice,
  status: VoiceRecord['status'] = 'published'
): VoiceRecord {
  const now = new Date().toISOString();
  return {
    ...voice,
    status,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Convert a VoiceRecord (database shape) back to a Voice (catalog shape).
 */
export function recordToVoice(record: VoiceRecord): Voice {
  const { status: _status, createdAt: _ca, updatedAt: _ua, ...voice } = record;
  return voice;
}

/**
 * Convert a ProviderDefinition to a ProviderRecord (database shape).
 */
export function providerToRecord(
  provider: ProviderDefinition,
  voiceCount: number,
  status: ProviderRecord['status'] = 'active'
): ProviderRecord {
  const now = new Date().toISOString();
  return {
    ...provider,
    slug: provider.id,
    voiceCount,
    status,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Convert a ProviderRecord (database shape) back to a ProviderDefinition.
 */
export function recordToProvider(record: ProviderRecord): ProviderDefinition {
  const {
    slug,
    voiceCount: _vc,
    status: _s,
    createdAt: _ca,
    updatedAt: _ua,
    description: _desc,
    colorHex: _ch,
    ...rest
  } = record;
  return {
    ...rest,
    id: slug,
  };
}

// ─── AppSync CRUD (authenticated, curator/admin only) ───

type ListPage<T> = {
  data: T[];
  nextToken?: string | null;
  errors?: unknown;
};

function assertNoErrors(errors: unknown) {
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error(`AppSync error: ${JSON.stringify(errors)}`);
  }
}

async function listAll<T>(
  fetchPage: (nextToken?: string) => Promise<ListPage<T>>
): Promise<T[]> {
  const output: T[] = [];
  let nextToken: string | undefined;
  do {
    const page = await fetchPage(nextToken);
    assertNoErrors(page.errors);
    output.push(...page.data);
    nextToken = page.nextToken ?? undefined;
  } while (nextToken);
  return output;
}

// ─── VoiceRecord CRUD ───

type VoiceRecordRow = {
  id: string;
  name: string;
  provider: string;
  providerId: string;
  providerVoiceId?: string | null;
  description: string;
  tags: string[];
  languages: string[];
  qualityTier?: string | null;
  licenseNotes?: string | null;
  metadata: unknown;
  modelCard?: unknown;
  imageUrl?: string | null;
  audioUrl?: string | null;
  samples?: unknown;
  variants?: unknown;
  status?: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

function rowToVoice(row: VoiceRecordRow): Voice {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    providerId: row.providerId || undefined,
    providerVoiceId: row.providerVoiceId || undefined,
    description: row.description,
    tags: row.tags || [],
    languages: row.languages || [],
    qualityTier: (row.qualityTier as Voice['qualityTier']) || 'standard',
    licenseNotes: row.licenseNotes || '',
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata as Voice['metadata']),
    modelCard: row.modelCard
      ? (typeof row.modelCard === 'string' ? JSON.parse(row.modelCard) : row.modelCard) as Voice['modelCard']
      : undefined,
    imageUrl: row.imageUrl || undefined,
    audioUrl: row.audioUrl || undefined,
    samples: typeof row.samples === 'string' ? JSON.parse(row.samples) : (row.samples as Voice['samples']) || [],
    variants: typeof row.variants === 'string' ? JSON.parse(row.variants) : (row.variants as Voice['variants']) || [],
  };
}

/**
 * List all VoiceRecords from DynamoDB (paginated, returns all).
 * Requires curator or admin role.
 */
export async function listVoiceRecords(): Promise<VoiceRecord[]> {
  const client = dataClient();
  const rows = await listAll<VoiceRecordRow>(async (nextToken) => {
    const response = await client.models.VoiceRecord.list({ limit: 100, nextToken });
    return response as ListPage<VoiceRecordRow>;
  });

  return rows.map((row) => ({
    ...rowToVoice(row),
    status: (row.status as VoiceRecord['status']) || 'published',
    createdAt: row.createdAtIso,
    updatedAt: row.updatedAtIso,
  }));
}

/**
 * Get a single VoiceRecord by ID.
 */
export async function getVoiceRecord(id: string): Promise<VoiceRecord | null> {
  const client = dataClient();
  const response = await client.models.VoiceRecord.get({ id });
  if (Array.isArray(response.errors) && response.errors.length > 0) {
    throw new Error(`Failed to get VoiceRecord ${id}`);
  }
  const row = response.data as VoiceRecordRow | null;
  if (!row) return null;

  return {
    ...rowToVoice(row),
    status: (row.status as VoiceRecord['status']) || 'published',
    createdAt: row.createdAtIso,
    updatedAt: row.updatedAtIso,
  };
}

/**
 * Create or update a VoiceRecord.
 * Uses upsert pattern: tries update first, falls back to create.
 */
export async function saveVoiceRecord(voice: Voice, status: VoiceRecord['status'] = 'published'): Promise<void> {
  const client = dataClient();
  const now = new Date().toISOString();

  const input = {
    id: voice.id,
    name: voice.name,
    provider: voice.provider,
    providerId: voice.providerId || '',
    providerVoiceId: voice.providerVoiceId || null,
    description: voice.description,
    tags: voice.tags || [],
    languages: voice.languages || [],
    qualityTier: voice.qualityTier || 'standard',
    licenseNotes: voice.licenseNotes || '',
    metadata: voice.metadata,
    modelCard: voice.modelCard || null,
    imageUrl: voice.imageUrl || null,
    audioUrl: voice.audioUrl || null,
    samples: voice.samples || [],
    variants: voice.variants || [],
    status,
    createdAtIso: now,
    updatedAtIso: now,
  };

  // Try update first
  try {
    const updated = await client.models.VoiceRecord.update(input);
    assertNoErrors(updated.errors);
    return;
  } catch {
    // Record doesn't exist yet — create it
  }

  const created = await client.models.VoiceRecord.create(input);
  assertNoErrors(created.errors);
}

/**
 * Delete a VoiceRecord by ID.
 */
export async function deleteVoiceRecord(id: string): Promise<void> {
  const client = dataClient();
  const deleted = await client.models.VoiceRecord.delete({ id });
  assertNoErrors(deleted.errors);
}

// ─── ProviderRecord CRUD ───

type ProviderRecordRow = {
  id: string;
  name: string;
  slug: string;
  type?: string | null;
  websiteUrl?: string | null;
  description?: string | null;
  colorHex?: string | null;
  voiceCount?: number | null;
  status?: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

/**
 * List all ProviderRecords from DynamoDB.
 */
export async function listProviderRecords(): Promise<ProviderRecord[]> {
  const client = dataClient();
  const rows = await listAll<ProviderRecordRow>(async (nextToken) => {
    const response = await client.models.ProviderRecord.list({ limit: 100, nextToken });
    return response as ListPage<ProviderRecordRow>;
  });

  return rows.map((row) => ({
    id: row.slug || row.id,
    name: row.name,
    slug: row.slug || row.id,
    type: (row.type as ProviderDefinition['type']) || 'other',
    websiteUrl: row.websiteUrl || undefined,
    description: row.description || undefined,
    colorHex: row.colorHex || undefined,
    voiceCount: row.voiceCount || 0,
    status: (row.status as ProviderRecord['status']) || 'active',
    createdAt: row.createdAtIso,
    updatedAt: row.updatedAtIso,
  }));
}

/**
 * Create or update a ProviderRecord.
 */
export async function saveProviderRecord(
  provider: ProviderDefinition,
  voiceCount: number,
  status: ProviderRecord['status'] = 'active'
): Promise<void> {
  const client = dataClient();
  const now = new Date().toISOString();

  const input = {
    id: provider.id,
    name: provider.name,
    slug: provider.id,
    type: provider.type || 'other',
    websiteUrl: provider.websiteUrl || null,
    description: null,
    colorHex: null,
    voiceCount,
    status,
    createdAtIso: now,
    updatedAtIso: now,
  };

  try {
    const updated = await client.models.ProviderRecord.update(input);
    assertNoErrors(updated.errors);
    return;
  } catch {
    // doesn't exist
  }

  const created = await client.models.ProviderRecord.create(input);
  assertNoErrors(created.errors);
}
