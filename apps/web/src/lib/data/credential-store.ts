/**
 * Credential Store — CRUD for UserProviderCredential in DynamoDB.
 *
 * Credentials are stored with owner-only auth (Cognito user pool).
 * Only the authenticated user can read/write their own credentials.
 * DynamoDB encrypts at rest by default (AWS managed keys).
 *
 * The credentialData field stores a JSON string with provider-specific
 * fields (apiKey, accessKeyId, subscriptionKey, region, etc.).
 */

import { dataClient } from '$lib/data/client';
import type { UserProviderCredential } from '$lib/types';
import type { CredentialData } from '$lib/synthesis/provider-auth';

type CredentialRow = {
  id: string;
  providerId: string;
  label: string;
  credentialData: string;
  status?: string | null;
  lastTestedAtIso?: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

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

function rowToCredential(row: CredentialRow): UserProviderCredential {
  return {
    id: row.id,
    providerId: row.providerId,
    label: row.label,
    status: (row.status as UserProviderCredential['status']) || 'active',
    lastTestedAt: row.lastTestedAtIso || undefined,
    createdAt: row.createdAtIso,
    updatedAt: row.updatedAtIso,
  };
}

/**
 * List all credentials for the current user.
 * Returns metadata only (no credential data for security).
 */
export async function listCredentials(): Promise<UserProviderCredential[]> {
  const client = dataClient();
  const response = await client.models.UserProviderCredential.list({ limit: 100 });
  assertNoErrors(response.errors);
  const rows = (response.data ?? []) as CredentialRow[];
  return rows.map(rowToCredential);
}

/**
 * Get a specific credential by ID.
 * Returns metadata only.
 */
export async function getCredential(id: string): Promise<UserProviderCredential | null> {
  const client = dataClient();
  const response = await client.models.UserProviderCredential.get({ id });
  assertNoErrors(response.errors);
  const row = response.data as CredentialRow | null;
  if (!row) return null;
  return rowToCredential(row);
}

/**
 * Get credential data (the actual API key/secrets) for a provider.
 * Returns the decrypted credential data, or null if no credential exists.
 */
export async function getCredentialData(providerId: string): Promise<CredentialData | null> {
  const client = dataClient();
  const response = await client.models.UserProviderCredential.list({
    limit: 100,
  });
  assertNoErrors(response.errors);
  const rows = (response.data ?? []) as CredentialRow[];

  // Find the active credential for this provider
  const row = rows.find(
    (r) => r.providerId === providerId && (r.status === 'active' || !r.status)
  );
  if (!row) return null;

  try {
    return JSON.parse(row.credentialData) as CredentialData;
  } catch {
    return null;
  }
}

/**
 * Save or update a credential for a provider.
 * Only one active credential per provider (upsert by providerId).
 */
export async function saveCredential(
  providerId: string,
  label: string,
  data: CredentialData
): Promise<UserProviderCredential> {
  const client = dataClient();
  const now = new Date().toISOString();

  // Check for existing credential for this provider
  const existing = await client.models.UserProviderCredential.list({ limit: 100 });
  assertNoErrors(existing.errors);
  const rows = (existing.data ?? []) as CredentialRow[];
  const existingRow = rows.find((r) => r.providerId === providerId);

  const input = {
    providerId,
    label,
    credentialData: JSON.stringify(data),
    status: 'active' as const,
    lastTestedAtIso: null as string | null,
    createdAtIso: now,
    updatedAtIso: now,
  };

  if (existingRow) {
    // Update existing
    const updated = await client.models.UserProviderCredential.update({
      id: existingRow.id,
      ...input,
      createdAtIso: existingRow.createdAtIso, // preserve original creation time
    });
    assertNoErrors(updated.errors);
    return rowToCredential(updated.data as CredentialRow);
  }

  // Create new
  const created = await client.models.UserProviderCredential.create(input);
  assertNoErrors(created.errors);
  return rowToCredential(created.data as CredentialRow);
}

/**
 * Update credential status (e.g., after testing).
 */
export async function updateCredentialStatus(
  id: string,
  status: UserProviderCredential['status']
): Promise<void> {
  const client = dataClient();
  const now = new Date().toISOString();
  const updated = await client.models.UserProviderCredential.update({
    id,
    status,
    lastTestedAtIso: now,
    updatedAtIso: now,
  });
  assertNoErrors(updated.errors);
}

/**
 * Delete a credential.
 */
export async function deleteCredential(id: string): Promise<void> {
  const client = dataClient();
  const deleted = await client.models.UserProviderCredential.delete({ id });
  assertNoErrors(deleted.errors);
}

/**
 * Check if user has an active credential for a provider.
 * Quick check without returning sensitive data.
 */
export async function hasCredentialFor(providerId: string): Promise<boolean> {
  const data = await getCredentialData(providerId);
  return data !== null;
}
