/**
 * @vokda/sdk — TypeScript client for the Vokda TTS API.
 *
 * @example Catalog (public, no auth)
 * ```ts
 * import { VokdaCatalogClient } from '@vokda/sdk';
 *
 * const catalog = new VokdaCatalogClient();
 * const { voices } = await catalog.listVoices();
 * const providers = await catalog.listProviders();
 * ```
 *
 * @example Synthesis (authenticated)
 * ```ts
 * import { VokdaClient } from '@vokda/sdk';
 *
 * const vokda = new VokdaClient({ apiKey: 'vk_live_...' });
 *
 * // Store a provider credential
 * await vokda.saveCredential({
 *   providerId: 'openai',
 *   credentialData: { apiKey: 'sk-...' },
 * });
 *
 * // Synthesize speech
 * const clip = await vokda.synthesize({
 *   text: 'Hello from Vokda!',
 *   provider: 'openai',
 *   providerVoiceId: 'alloy',
 * });
 *
 * console.log(clip.audioUrl); // presigned S3 URL
 * ```
 */

export { VokdaCatalogClient, VokdaClient, VokdaApiError } from './client.js';

export type {
  CatalogClientOptions,
  VokdaClientOptions,
} from './client.js';

// Re-export all types
export type {
  ProviderId,
  AuthType,
  QualityTier,
  Gender,
  ClipStatus,
  InputMode,
  ProviderType,
  VoiceSample,
  VoiceVariant,
  VoiceMetadata,
  ModelCard,
  Voice,
  VoiceCatalog,
  Provider,
  ProviderList,
  ProviderBreakdown,
  CatalogStats,
  SynthesizeRequest,
  SynthesizeResponse,
  BatchSynthesizeItem,
  BatchSynthesizeRequest,
  BatchSynthesizeJob,
  BatchSynthesizeResponse,
  Clip,
  ClipList,
  ClipUpdate,
  ClipDeleted,
  SaveCredentialRequest,
  CredentialSaved,
  Credential,
  CredentialList,
  CredentialTestRequest,
  CredentialTestResult,
  CredentialDeleted,
  ApiKey,
  ApiKeyCreated,
  ApiKeyList,
  Usage,
  ApiError,
} from './types.js';
