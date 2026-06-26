/**
 * Human-facing status for a stored provider credential.
 *
 * A credential merely being saved does NOT mean its key works — previously the
 * UI showed a blanket "Connected" for any active credential, which overstated
 * validity (e.g. an expired AWS Polly key still read as "Connected"). This
 * distinguishes saved-but-unverified from verified (a test has passed) from
 * explicitly invalid/expired.
 */

export type CredentialStatusKind = 'none' | 'unverified' | 'verified' | 'invalid' | 'expired';

export interface CredentialStatusLabel {
  kind: CredentialStatusKind;
  text: string;
}

/** A credential is "verified" only once a connection test has passed, which is
 *  recorded as lastTestedAt. */
export function credentialStatusLabel(
  cred?: { status?: string; lastTestedAt?: string | null }
): CredentialStatusLabel {
  if (!cred) return { kind: 'none', text: 'Not connected' };
  if (cred.status === 'invalid') return { kind: 'invalid', text: 'Invalid key' };
  if (cred.status === 'expired') return { kind: 'expired', text: 'Expired' };
  if (cred.lastTestedAt) return { kind: 'verified', text: 'Verified' };
  return { kind: 'unverified', text: 'Saved · unverified' };
}
