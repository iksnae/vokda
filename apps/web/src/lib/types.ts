export type VoiceVariant = {
  id: string;
  sourceType: 'cloud_provider' | 'hf_model' | 'hf_space' | 'hf_endpoint' | 'self_hosted';
  sourceKey: string;
  runnable: boolean;
  supportsSsml: boolean;
  outputFormats: Array<'mp3' | 'wav' | 'pcm'>;
  maxInputChars: number;
  previewOnly: boolean;
};

export type VoiceMetadata = {
  shortLabel: string;
  searchDescription: string;
  machineTags: string[];
  useCases: string[];
  toneTags: string[];
  audienceTags: string[];
  accent?: string;
  genderPresentation?: string;
  agePresentation?: string;
  speakingStyle?: string;
  metadataQuality: 'sparse' | 'curated' | 'editorial';
};

export type Voice = {
  id: string;
  name: string;
  provider: string;
  description: string;
  tags: string[];
  languages: string[];
  qualityTier: 'basic' | 'standard' | 'premium';
  licenseNotes: string;
  metadata: VoiceMetadata;
  samples: VoiceSample[];
  variants: VoiceVariant[];
};

export type VoiceSample = {
  id: string;
  scriptKey: string;
  label: string;
  transcript: string;
  audioUrl?: string;
};

export type CartItem = {
  voiceId: string;
  variantId: string;
  addedAt: string;
};

export type Collection = {
  id: string;
  name: string;
  voiceIds: string[];
  notesByVoiceId: Record<string, string>;
  createdAt: string;
};

export type VoicePack = {
  version: string;
  createdAt: string;
  items: Array<{
    voiceId: string;
    voiceName: string;
    variantId: string;
    sourceType: VoiceVariant['sourceType'];
    sourceKey: string;
    runnable: boolean;
    supportsSsml: boolean;
    outputFormats: VoiceVariant['outputFormats'];
    licenseNotes: string;
  }>;
};
