export type VoiceVariant = {
  id: string;
  sourceType: 'cloud_provider' | 'local_model' | 'hf_model' | 'hf_space' | 'hf_endpoint' | 'self_hosted';
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
  providerId?: string;
  providerVoiceId?: string;
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
  collectionName: string;
  format: 'vokda.voice-collection.v1';
  voiceProfiles: VoiceProfile[];
  catalogHints?: {
    castingHints?: CharacterCastingHint[];
  };
};

export type ProviderDefinition = {
  id: string;
  name: string;
  type: 'cloud_provider' | 'open_model' | 'self_hosted' | 'other';
  websiteUrl?: string;
  createdBy?: 'system' | 'admin';
  createdAt?: string;
};

export type VoiceProfile = {
  id: string;
  name: string;
  description?: string;
  language: string;
  gender?: string;
  ageRange?: string;
  tone?: string;
  accent?: string;
  personalityTags?: string[];
  emotionalRange?: string[];
  voiceQuality?: string;
  previewUrl?: string;
  recommendedFor?: string[];
  sampleCount: number;
  provider?: string;
  providerVoiceId?: string;
  seed?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CharacterCastingHint = {
  voiceProfileId: string;
  voiceProfileName: string;
  confidence?: number;
  justification?: string;
  matchedAttributes?: string[];
  manualOverride?: boolean;
};
