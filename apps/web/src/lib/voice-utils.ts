import type { Voice, VoiceVariant } from '$lib/types';

export function stripSsml(input: string): string {
  return input.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export function getVariantWarnings(voice: Voice, variant: VoiceVariant): string[] {
  const warnings: string[] = [];

  if (variant.previewOnly) warnings.push('Preview-only variant may be unstable for production export.');
  if (!variant.supportsSsml) warnings.push('SSML will be stripped for this variant.');
  if (/verify|check|preview|prototype/i.test(voice.licenseNotes)) {
    warnings.push('Review licensing terms before commercial distribution.');
  }

  return warnings;
}

export function truncateToVariantLimit(input: string, variant: VoiceVariant): string {
  if (input.length <= variant.maxInputChars) return input;
  return input.slice(0, variant.maxInputChars);
}
