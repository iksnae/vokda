/**
 * Voice Store — mapping functions and data layer for VoiceRecord / ProviderRecord.
 *
 * Pure mapping functions (voiceToRecord, recordToVoice, etc.) are used by:
 * - Seed script (voices.json → DynamoDB)
 * - Publish script (DynamoDB → voices.json)
 * - Curation/admin pages (AppSync CRUD)
 *
 * AppSync CRUD functions are separated and only called from authenticated contexts.
 */

import type {
  Voice,
  VoiceRecord,
  ProviderDefinition,
  ProviderRecord,
} from '$lib/types';

// ─── Pure Mapping Functions ───

/**
 * Convert a Voice (catalog shape) to a VoiceRecord (database shape).
 * Adds status='published' and timestamps if not already present.
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
 * Strips status, createdAt, updatedAt — the catalog doesn't need them.
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
 * Strips record-only fields. Uses slug as the id.
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
