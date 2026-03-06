/**
 * Synthesis adapter registry.
 *
 * Two modes:
 * 1. Mock mode (default): All adapters return simulated previews
 * 2. BYOK mode: Real adapters created from user's stored credentials
 *
 * The registry dynamically builds adapters based on available credentials.
 */

import type { SynthesisAdapter } from './types';
import type { VoiceVariant } from '$lib/types';
import type {
  ApiKeyCredential,
  AwsCredentials,
  CredentialData,
  SubscriptionKeyCredential,
} from './provider-auth';
import { hasValidOAuthToken } from './oauth';

// ─── Mock adapters (legacy, used when no credentials available) ───
import { createMockAdapter } from './adapters/mock-base';

const mockAdapters: SynthesisAdapter[] = [
  createMockAdapter('aws-polly', (v) => v.sourceKey.startsWith('aws-polly:')),
  createMockAdapter('azure-speech', (v) => v.sourceKey.startsWith('azure:')),
  createMockAdapter('gcp-tts', (v) => v.sourceKey.startsWith('gcp:')),
  createMockAdapter('elevenlabs', (v) => v.sourceKey.startsWith('elevenlabs:')),
  createMockAdapter('openai', (v) => v.sourceKey.startsWith('openai:')),
  createMockAdapter('deepgram', (v) => v.sourceKey.startsWith('deepgram:')),
  createMockAdapter('cartesia', (v) => v.sourceKey.startsWith('cartesia:')),
  createMockAdapter('lmnt', (v) => v.sourceKey.startsWith('lmnt:')),
  createMockAdapter('gemini-tts', (v) => v.sourceKey.startsWith('gemini:')),
  createMockAdapter('huggingface', (v) =>
    v.sourceType === 'hf_model' || v.sourceType === 'hf_space' || v.sourceType === 'hf_endpoint'
  ),
  createMockAdapter('self-hosted', (v) => v.sourceType === 'self_hosted'),
  createMockAdapter('local-model', (v) => v.sourceType === 'local_model'),
];

// ─── Real adapter factories ───
import { createOpenAIAdapter } from './adapters/openai';
import { createElevenLabsAdapter } from './adapters/elevenlabs-real';
import { createDeepgramAdapter } from './adapters/deepgram-real';
import { createCartesiaAdapter } from './adapters/cartesia-real';
import { createLmntAdapter } from './adapters/lmnt-real';
import { createAzureSpeechAdapter } from './adapters/azure-speech-real';
import { createGcpTtsAdapter } from './adapters/gcp-tts-real';
import { createGeminiTtsAdapter } from './adapters/gemini-tts-real';
import { createAwsPollyAdapter } from './adapters/aws-polly-real';

type AdapterFactory = {
  providerId: string;
  create: (credential: CredentialData) => SynthesisAdapter;
};

const adapterFactories: AdapterFactory[] = [
  {
    providerId: 'openai',
    create: (cred) => createOpenAIAdapter(cred as ApiKeyCredential),
  },
  {
    providerId: 'elevenlabs',
    create: (cred) => createElevenLabsAdapter(cred as ApiKeyCredential),
  },
  {
    providerId: 'deepgram',
    create: (cred) => createDeepgramAdapter(cred as ApiKeyCredential),
  },
  {
    providerId: 'cartesia',
    create: (cred) => createCartesiaAdapter(cred as ApiKeyCredential),
  },
  {
    providerId: 'lmnt',
    create: (cred) => createLmntAdapter(cred as ApiKeyCredential),
  },
  {
    providerId: 'azure-speech',
    create: (cred) => createAzureSpeechAdapter(cred as SubscriptionKeyCredential),
  },
  {
    providerId: 'gcp-tts',
    create: (cred) => createGcpTtsAdapter(cred as ApiKeyCredential),
  },
  {
    providerId: 'gemini-tts',
    create: (cred) => createGeminiTtsAdapter(cred as ApiKeyCredential),
  },
  {
    providerId: 'aws-polly',
    create: (cred) => createAwsPollyAdapter(cred as AwsCredentials),
  },
];

// ─── Credential-backed adapter cache ───

const activeAdapters = new Map<string, SynthesisAdapter>();

/**
 * Register a real adapter using user credentials.
 * Called when credentials are loaded from DynamoDB.
 */
export function registerCredentialAdapter(
  providerId: string,
  credential: CredentialData
): SynthesisAdapter | null {
  const factory = adapterFactories.find((f) => f.providerId === providerId);
  if (!factory) return null;

  const adapter = factory.create(credential);
  activeAdapters.set(providerId, adapter);
  return adapter;
}

/**
 * Remove a registered credential adapter (e.g., when credential deleted).
 */
export function unregisterCredentialAdapter(providerId: string): void {
  activeAdapters.delete(providerId);
}

/**
 * Clear all registered credential adapters (e.g., on sign out).
 */
export function clearCredentialAdapters(): void {
  activeAdapters.clear();
}

/**
 * Get the provider ID a variant belongs to.
 */
export function getProviderForVariant(variant: VoiceVariant): string | null {
  const sourceKey = variant.sourceKey;
  if (sourceKey.startsWith('openai:')) return 'openai';
  if (sourceKey.startsWith('elevenlabs:')) return 'elevenlabs';
  if (sourceKey.startsWith('deepgram:')) return 'deepgram';
  if (sourceKey.startsWith('cartesia:')) return 'cartesia';
  if (sourceKey.startsWith('lmnt:')) return 'lmnt';
  if (sourceKey.startsWith('azure:')) return 'azure-speech';
  if (sourceKey.startsWith('gcp:')) return 'gcp-tts';
  if (sourceKey.startsWith('gemini:')) return 'gemini-tts';
  if (sourceKey.startsWith('aws-polly:')) return 'aws-polly';
  if (sourceKey.startsWith('edge-tts:')) return 'edge-tts';
  return null;
}

/**
 * Check if a real (non-mock) adapter is available for a variant.
 * Checks both credential-backed adapters and OAuth tokens.
 */
export function hasRealAdapter(variant: VoiceVariant): boolean {
  const providerId = getProviderForVariant(variant);
  if (!providerId) return false;
  // Real adapter from stored credentials
  if (activeAdapters.has(providerId)) return true;
  // OAuth token available (adapters will pick it up automatically)
  if (hasValidOAuthToken(providerId)) return true;
  return false;
}

/**
 * Resolve the best adapter for a variant.
 *
 * Priority:
 * 1. Real adapter from user credentials
 * 2. Mock adapter (fallback)
 */
export function resolveAdapter(variant: VoiceVariant): SynthesisAdapter | null {
  // Check for credential-backed real adapter first
  const providerId = getProviderForVariant(variant);
  if (providerId) {
    const real = activeAdapters.get(providerId);
    if (real) return real;
  }

  // Fall back to mock adapter
  return mockAdapters.find((adapter) => adapter.canHandle(variant)) ?? null;
}

/**
 * Get list of provider IDs that have active real adapters.
 */
export function getConnectedProviders(): string[] {
  return Array.from(activeAdapters.keys());
}

export { mockAdapters as adapters };
