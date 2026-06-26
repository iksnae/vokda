/**
 * Per-provider catalog aggregation.
 *
 * Rolls the voice catalog up by provider — counts, languages, quality tiers,
 * SSML support, a representative image — and merges in auth/pricing metadata.
 * Pure and side-effect-free so it can power both the provider directory and
 * the provider card on the voice-detail page.
 */

import type { Voice, ProviderDefinition } from '$lib/types';
import { getPrimaryLanguage } from '$lib/language-utils';
import type { ProviderAuthConfig } from '$lib/synthesis/provider-auth';

export interface ProviderCatalogEntry {
  id: string;
  name: string;
  type: ProviderDefinition['type'];
  websiteUrl?: string;
  voiceCount: number;
  languages: string[];
  languageCount: number;
  qualityTiers: Voice['qualityTier'][];
  ssmlSupport: boolean;
  genders: string[];
  sampleImageUrl?: string;
  pricingSummary?: string;
  pricingUrl?: string;
  freeTier?: string | null;
  features?: string[];
  signupUrl?: string;
}

export function buildProviderCatalog(
  voices: Voice[],
  providerDefs: ProviderDefinition[],
  authConfigs: ProviderAuthConfig[] = []
): ProviderCatalogEntry[] {
  const byProvider = new Map<string, Voice[]>();
  for (const voice of voices) {
    const id = voice.providerId;
    if (!id) continue;
    const group = byProvider.get(id);
    if (group) group.push(voice);
    else byProvider.set(id, [voice]);
  }

  const entries: ProviderCatalogEntry[] = [];
  for (const def of providerDefs) {
    const group = byProvider.get(def.id);
    if (!group || group.length === 0) continue;

    const languages = [...new Set(group.map(getPrimaryLanguage))].sort();
    const qualityTiers = [...new Set(group.map((v) => v.qualityTier))];
    const genders = [
      ...new Set(group.map((v) => v.metadata?.genderPresentation).filter((g): g is string => Boolean(g))),
    ].sort();
    const ssmlSupport = group.some((v) => (v.variants ?? []).some((variant) => variant.supportsSsml));
    const sampleImageUrl = group.find((v) => v.imageUrl)?.imageUrl;
    const auth = authConfigs.find((c) => c.providerId === def.id);

    entries.push({
      id: def.id,
      name: def.name,
      type: def.type,
      websiteUrl: def.websiteUrl,
      voiceCount: group.length,
      languages,
      languageCount: languages.length,
      qualityTiers,
      ssmlSupport,
      genders,
      sampleImageUrl,
      pricingSummary: auth?.pricingSummary,
      pricingUrl: auth?.pricingUrl,
      freeTier: auth?.freeTier,
      features: auth?.features,
      signupUrl: auth?.signupUrl,
    });
  }
  return entries;
}

export function getProviderCatalogEntry(
  providerId: string,
  voices: Voice[],
  providerDefs: ProviderDefinition[],
  authConfigs: ProviderAuthConfig[] = []
): ProviderCatalogEntry | undefined {
  return buildProviderCatalog(voices, providerDefs, authConfigs).find((e) => e.id === providerId);
}
