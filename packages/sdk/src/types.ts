/**
 * Vokda API types — derived from OpenAPI 3.1 spec.
 *
 * These types map 1:1 to the `components/schemas` in openapi.json.
 * Import from `@vokda/sdk/types` if you only need types (no runtime).
 */

// ─── Provider IDs ────────────────────────────────────────────────────────────

export type ProviderId =
  | 'openai'
  | 'elevenlabs'
  | 'deepgram'
  | 'gemini-tts'
  | 'cartesia'
  | 'lmnt'
  | 'gcp-tts'
  | 'azure-speech'
  | 'aws-polly';

export type AuthType = 'api_key' | 'subscription_key' | 'aws_credentials' | 'none';
export type QualityTier = 'premium' | 'standard' | 'basic';
export type Gender = 'male' | 'female' | 'neutral';
/** Canonical status enum for synthesis jobs (`/v1/synthesize`). Consumers can rely on these three values. */
export type ClipStatus = 'completed' | 'pending' | 'failed';
export type InputMode = 'text' | 'ssml';
export type ProviderType = 'cloud' | 'local' | 'free';

// ─── Catalog ─────────────────────────────────────────────────────────────────

export interface VoiceSample {
  id: string;
  label: string;
  scriptKey: string;
  transcript: string;
  audioUrl: string;
}

export interface VoiceVariant {
  id: string;
  sourceKey: string;
  sourceType: string;
  runnable: boolean;
  previewOnly: boolean;
  supportsSsml: boolean;
  outputFormats: string[];
  maxInputChars: number | null;
}

export interface VoiceMetadata {
  genderPresentation?: Gender;
  agePresentation?: string;
  toneTags?: string[];
  useCases?: string[];
  audienceTags?: string[];
  machineTags?: string[];
  shortLabel?: string;
  searchDescription?: string;
  metadataQuality?: 'curated' | 'generated' | 'sparse';
}

export interface ModelCard {
  modelFamily?: string;
  architecture?: string;
  providerName?: string;
  providerType?: string;
  providerUrl?: string;
  releaseDate?: string;
  sampleRate?: number;
  multilingual?: boolean;
  ssmlSupport?: boolean;
  emotionControl?: boolean;
  voiceCloning?: boolean;
  streamingSupport?: boolean;
  wordTimestamps?: boolean;
  latencyMs?: string;
  license?: string;
  licenseUrl?: string;
  commercialUse?: boolean;
  attributionRequired?: boolean;
  gdprCompliant?: boolean;
  knownLimitations?: string[];
}

/** Steering family — which kind of expressivity control a voice supports. */
export type SteeringKind = 'instructions' | 'styles' | 'settings' | 'none';

/** A numeric expressivity control (ElevenLabs `voice_settings`). */
export interface SteeringSetting {
  key: string;
  min: number;
  max: number;
  default: number;
}

/**
 * Expressivity control ("steering") a voice supports, and which `options.*` to
 * send when synthesizing. Mirror of the synthesis API's `/v1/voices` `steering`
 * descriptor:
 *  - `instructions` — free-text direction in `options.instructions` (OpenAI).
 *  - `settings`     — numeric `options.voice_settings` per {@link settings}; set
 *    `options.model_id` to {@link audioTagsModel} to enable inline audio tags (ElevenLabs).
 *  - `styles`       — one of {@link options} in `options.speakingStyle` (AWS Polly newscaster).
 *  - `none`         — no steering.
 */
export interface Steering {
  kind: SteeringKind;
  /** The `options.*` key to send (e.g. `instructions`, `voice_settings`, `speakingStyle`). */
  param?: string;
  /** `instructions`: guidance on what free-text direction to write. */
  hint?: string;
  /** `styles`: allowed values for `options[param]`. */
  options?: string[];
  /** `settings`: numeric ranges. */
  settings?: SteeringSetting[];
  /** `settings` (ElevenLabs): set `options.model_id` to this to enable inline audio tags. */
  audioTagsModel?: string;
}

export interface Voice {
  id: string;
  name: string;
  provider: string;
  providerId: string;
  providerVoiceId: string;
  description: string;
  tags: string[];
  languages: string[];
  qualityTier: QualityTier;
  gender?: Gender;
  imageUrl?: string | null;
  licenseNotes?: string;
  metadata?: VoiceMetadata;
  modelCard?: ModelCard;
  variants: VoiceVariant[];
  samples: VoiceSample[];
  /** Expressivity control this voice supports (and which `options.*` to send). */
  steering?: Steering;
}

export interface VoiceCatalog {
  voices: Voice[];
  generatedAt?: string;
}

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  description: string | null;
  voiceCount: number;
  languages: string[];
  languageCount: number;
  qualityTiers: string[];
  genders: string[];
  ssmlCapable: boolean;
  audioSampleCoverage: string;
  hasSynthesis: boolean;
  /** Maximum input text length (characters) accepted by this provider's synthesis endpoint. null when unbounded or unknown. */
  maxTextLength?: number | null;
  /** Audio output formats this provider supports (e.g. mp3, wav, opus). */
  outputFormats?: string[];
  /** Whether this provider supports streaming (real-time) synthesis. */
  supportsStreaming?: boolean;
  authType: AuthType;
  websiteUrl: string | null;
  docsUrl: string | null;
  signupUrl: string | null;
  pricingUrl: string | null;
  pricingSummary: string | null;
  freeTier: string | null;
  license: string | null;
  commercialUse: boolean | null;
}

export interface ProviderList {
  total: number;
  generatedAt: string;
  providers: Provider[];
}

export interface ProviderBreakdown {
  id: string;
  name: string;
  count: number;
}

export interface CatalogStats {
  generatedAt: string;
  totalVoices: number;
  totalProviders: number;
  totalLanguages: number;
  withAudio: number;
  withImage: number;
  withModelCard: number;
  byProvider: ProviderBreakdown[];
  byQualityTier: { premium: number; standard: number; basic: number };
  capabilities: { localModels: number; multilingual: number; ssmlSupport: number };
}

// ─── Synthesis ───────────────────────────────────────────────────────────────

export interface SynthesizeRequest {
  text: string;
  provider: ProviderId;
  providerVoiceId?: string;
  voiceName?: string;
  voiceId?: string;
  mode?: InputMode;
  async?: boolean;
  options?: Record<string, unknown>;
}

/**
 * Precomputed waveform peaks (BBC `audiowaveform` JSON shape). `data` holds
 * interleaved min/max pairs per pixel, quantized to the signed `bits` range
 * (8-bit → ±127). Built server-side; null when the audio couldn't be decoded.
 */
export interface Waveform {
  version: number;
  channels: number;
  sample_rate: number;
  samples_per_pixel: number;
  bits: number;
  length: number;
  data: number[];
}

export interface SynthesizeResponse {
  jobId: string;
  status: ClipStatus;
  audioUrl?: string;
  fileSizeBytes?: number;
  durationMs?: number | null;
  latencyMs?: number;
  provider?: string;
  voiceId?: string | null;
  voiceName?: string | null;
  waveform?: Waveform | null;
  createdAt?: string;
  message?: string;
}

/** A single item in a batch synthesis request (always processed async). */
export type BatchSynthesizeItem = Omit<SynthesizeRequest, 'async'>;

export interface BatchSynthesizeRequest {
  /** Up to 50 items. Each is validated independently. */
  items: BatchSynthesizeItem[];
}

export interface BatchSynthesizeJob {
  index: number;
  status: 'pending' | 'rejected';
  jobId?: string;
  error?: string;
}

export interface BatchSynthesizeResponse {
  total: number;
  queued: number;
  rejected: number;
  jobs: BatchSynthesizeJob[];
  message?: string;
}

// ─── Clips ───────────────────────────────────────────────────────────────────

export interface Clip {
  jobId: string;
  voiceId: string;
  voiceName: string | null;
  provider: string;
  status: ClipStatus;
  inputText: string;
  inputMode: InputMode;
  clipName: string | null;
  clipDescription: string | null;
  clipTags: string[];
  audioUrl: string | null;
  fileSizeBytes: number | null;
  durationMs: number | null;
  latencyMs: number | null;
  waveform: Waveform | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface ClipList {
  jobs: Clip[];
  count: number;
}

export interface ClipUpdate {
  clipName?: string | null;
  clipDescription?: string | null;
  clipTags?: string[];
}

export interface ClipDeleted {
  deleted: boolean;
  freedBytes: number;
}

// ─── Credentials ─────────────────────────────────────────────────────────────

export interface SaveCredentialRequest {
  providerId: ProviderId;
  credentialData: Record<string, string>;
  label?: string;
}

export interface CredentialSaved {
  providerId: string;
  label: string;
  authType: AuthType;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Credential {
  providerId: string;
  label: string;
  authType: AuthType;
  status: string;
  maskedKey: string | null;
  createdAt: string;
  updatedAt: string;
  lastTestedAt: string | null;
}

export interface CredentialList {
  credentials: Credential[];
  count: number;
}

export interface CredentialTestRequest {
  providerId: ProviderId;
  credentialData: Record<string, string>;
}

export interface CredentialTestResult {
  success: boolean;
  latencyMs?: number;
  error?: string;
}

export interface CredentialDeleted {
  deleted: boolean;
  providerId: string;
}

// ─── API Keys ────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  keyPrefix: string;
  label: string | null;
  status: 'active' | 'revoked';
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ApiKeyCreated {
  id: string;
  key: string;
  keyPrefix: string;
  label: string;
  status: string;
  createdAt: string;
}

export interface ApiKeyList {
  keys: ApiKey[];
}

// ─── Usage ───────────────────────────────────────────────────────────────────

export interface Usage {
  totalBytes: number;
  fileCount: number;
  quotaBytes: number;
  usagePercent: number;
  remainingBytes: number;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message?: string;
  supported?: string[];
}
