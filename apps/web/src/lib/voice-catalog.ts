import type { Voice, VoiceMetadata, VoiceVariant } from '$lib/types';

export type VoiceMetadataPatch = Partial<VoiceMetadata>;

export function applyVoiceMetadataPatch(voice: Voice, patch?: VoiceMetadataPatch): Voice {
  if (!patch) return voice;

  return {
    ...voice,
    metadata: {
      ...voice.metadata,
      ...patch,
      machineTags: patch.machineTags ?? voice.metadata.machineTags,
      useCases: patch.useCases ?? voice.metadata.useCases,
      toneTags: patch.toneTags ?? voice.metadata.toneTags,
      audienceTags: patch.audienceTags ?? voice.metadata.audienceTags
    }
  };
}

export function buildEffectiveCatalog(
  baseVoices: Voice[],
  metadataOverrides: Record<string, VoiceMetadataPatch>,
  customVoices: Voice[]
): Voice[] {
  const mergedBase = baseVoices.map((voice) => applyVoiceMetadataPatch(voice, metadataOverrides[voice.id]));

  const patchedCustom = customVoices.map((voice) => applyVoiceMetadataPatch(voice, metadataOverrides[voice.id]));

  return [...mergedBase, ...patchedCustom];
}

export function createVoiceFromDraft(input: {
  name: string;
  provider: string;
  description: string;
  languages: string[];
  sourceType: VoiceVariant['sourceType'];
  sourceKey: string;
  shortLabel: string;
  searchDescription: string;
  machineTags: string[];
  toneTags: string[];
  useCases: string[];
  audienceTags: string[];
}): Voice {
  const id = `custom-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  return {
    id,
    name: input.name,
    provider: input.provider,
    description: input.description,
    tags: Array.from(new Set([...input.machineTags, ...input.toneTags])).slice(0, 12),
    languages: input.languages,
    qualityTier: 'standard',
    licenseNotes: 'Curated custom entry. Provider licensing review required.',
    metadata: {
      shortLabel: input.shortLabel,
      searchDescription: input.searchDescription,
      machineTags: input.machineTags,
      useCases: input.useCases,
      toneTags: input.toneTags,
      audienceTags: input.audienceTags,
      metadataQuality: 'curated'
    },
    samples: [
      {
        id: `sample-${id}`,
        scriptKey: 'curation-draft',
        label: 'Draft reference sample',
        transcript: `Draft voice added on ${now}.`
      }
    ],
    variants: [
      {
        id: `variant-${id}`,
        sourceType: input.sourceType,
        sourceKey: input.sourceKey,
        runnable: true,
        supportsSsml: true,
        outputFormats: ['mp3', 'wav'],
        maxInputChars: 3000,
        previewOnly: false
      }
    ]
  };
}

export function csvToList(input: string): string[] {
  return input
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function listToCsv(input: string[]): string {
  return input.join(', ');
}
