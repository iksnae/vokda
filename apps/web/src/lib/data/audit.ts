import { dataClient } from '$lib/data/client';

type AuditAction =
  | 'role.grant'
  | 'role.revoke'
  | 'provider.create'
  | 'provider.update'
  | 'provider.delete'
  | 'curation.publish'
  | 'shelf.create'
  | 'shelf.update'
  | 'shelf.delete'
  | 'collection.export';

/**
 * Log an admin audit event to DynamoDB.
 * Silently fails if user is not an admin or Amplify is not configured.
 */
export async function logAuditEvent(
  action: AuditAction,
  targetType: string,
  targetId: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    const client = dataClient();
    const created = await client.models.AdminAuditEvent.create({
      action,
      targetType,
      targetId,
      payload: payload ?? null,
      createdAtIso: new Date().toISOString()
    });

    if (Array.isArray(created.errors) && created.errors.length > 0) {
      console.warn('[vokda:audit] Failed to log event', created.errors);
    }
  } catch (error) {
    // Audit logging is best-effort — don't block operations
    console.warn('[vokda:audit] Error logging event', error);
  }
}
