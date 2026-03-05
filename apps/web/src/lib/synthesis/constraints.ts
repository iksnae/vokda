import type { VoiceVariant } from '$lib/types';
import type { PreviewInputMode } from './types';
import { stripSsml } from '$lib/voice-utils';

export type ConstraintResult = {
  text: string;
  warnings: string[];
};

export function normalizePreviewInput(
  input: string,
  mode: PreviewInputMode,
  variant: VoiceVariant
): ConstraintResult {
  const warnings: string[] = [];

  const base = mode === 'ssml' ? input : input;
  let normalized = base;

  if (mode === 'ssml' && !variant.supportsSsml) {
    normalized = stripSsml(base);
    warnings.push('SSML stripped because selected variant does not support SSML.');
  }

  if (normalized.length > variant.maxInputChars) {
    normalized = normalized.slice(0, variant.maxInputChars);
    warnings.push(`Input truncated to ${variant.maxInputChars} characters.`);
  }

  if (variant.previewOnly) {
    warnings.push('Preview-only variant may differ from production synthesis behavior.');
  }

  return {
    text: normalized.trim(),
    warnings
  };
}
