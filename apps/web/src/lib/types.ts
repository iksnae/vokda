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

export type VoiceModelCard = {
  /** Model / voice identity */
  modelName?: string;
  modelVersion?: string;
  modelFamily?: string;
  modelSize?: string;
  architecture?: string;

  /** Provider info */
  providerName: string;
  providerType: 'cloud_api' | 'local_mlx' | 'open_model' | 'self_hosted';
  providerUrl?: string;
  modelUrl?: string;
  apiEndpoint?: string;

  /** Training & capabilities */
  trainingData?: string;
  baseModel?: string;
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  streamingSupport?: boolean;
  voiceCloning?: boolean;
  emotionControl?: boolean;
  ssmlSupport?: boolean;
  wordTimestamps?: boolean;
  multilingual?: boolean;

  /** Supported features */
  supportedLanguages?: string[];
  supportedStyles?: string[];
  supportedEmotions?: string[];

  /** Performance */
  realtimeFactor?: string;
  latencyMs?: string;
  maxInputLength?: number;
  concurrencyLimit?: number;

  /** Licensing & compliance */
  license?: string;
  licenseUrl?: string;
  commercialUse?: boolean;
  attributionRequired?: boolean;
  dataRetention?: string;
  gdprCompliant?: boolean;

  /** Runtime requirements (local models) */
  runtime?: string;
  quantization?: string;
  diskSize?: string;
  memoryRequired?: string;
  hardwareRequirements?: string;

  /** Dates */
  releaseDate?: string;
  lastUpdated?: string;

  /** Additional context */
  paperUrl?: string;
  citationBibtex?: string;
  knownLimitations?: string[];
  ethicsNotes?: string[];
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
  modelCard?: VoiceModelCard;
  imageUrl?: string;
  audioUrl?: string;
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

export type CurationShelf = {
  id: string;
  key: string;
  title: string;
  description: string;
  voiceIds: string[];
  published: boolean;
  updatedAt: string;
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

// ─── Data Layer Records ───

export type VoiceRecord = Voice & {
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
};

export type ProviderRecord = ProviderDefinition & {
  slug: string;
  description?: string;
  colorHex?: string;
  voiceCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

export type UserProviderCredential = {
  id: string;
  providerId: string;
  label: string;
  status: 'active' | 'invalid' | 'expired';
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SynthesisJob = {
  id: string;
  voiceId: string;
  variantSourceKey: string;
  inputText: string;
  inputMode: 'text' | 'ssml';
  status: 'pending' | 'completed' | 'failed';
  audioUrl?: string;
  durationMs?: number;
  latencyMs?: number;
  provider: string;
  errorMessage?: string;
  createdAt: string;
};
