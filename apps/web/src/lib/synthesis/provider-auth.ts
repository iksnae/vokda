/**
 * Provider authentication requirements.
 *
 * Defines what credentials each provider needs for BYOK synthesis.
 * Auth types:
 * - 'api_key': Single API key (most providers)
 * - 'aws_credentials': AWS access key + secret + region
 * - 'subscription_key': Azure-style key + region
 * - 'none': Free provider, no credentials needed
 *
 * Some providers also support OAuth as an alternative to API keys:
 * - Google (GCP TTS + Gemini TTS) — Sign in with Google
 * - Microsoft (Azure Speech) — Sign in with Microsoft
 *
 * OAuth tokens are short-lived (~1 hour) and stored in memory only.
 * API keys are stored persistently in DynamoDB (owner-only auth).
 */

import type { OAuthProvider } from './oauth';

export type CredentialField = {
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder: string;
  required: boolean;
};

export type OAuthOption = {
  provider: OAuthProvider;
  label: string;
  buttonLabel: string;
  /** What scopes are needed */
  scopes: string[];
};

export type ProviderAuthConfig = {
  providerId: string;
  authType: 'api_key' | 'aws_credentials' | 'subscription_key' | 'none';
  fields: CredentialField[];
  docsUrl?: string;
  signupUrl?: string;
  pricingUrl?: string;
  pricingSummary?: string;
  freeTier?: string | null;
  features?: string[];
  /** OAuth alternative to API key (if available) */
  oauth?: OAuthOption;
  freeProvider?: boolean;
  notes?: string;
};

export const PROVIDER_AUTH_CONFIGS: ProviderAuthConfig[] = [
  {
    providerId: 'openai',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true }
    ],
    docsUrl: 'https://platform.openai.com/docs/guides/text-to-speech',
    signupUrl: 'https://platform.openai.com/signup',
    pricingUrl: 'https://openai.com/api/pricing/',
    pricingSummary: '$15/1M chars (tts-1), $30/1M chars (tts-1-hd)',
    freeTier: null,
    features: ['6 voices', 'HD model', 'Streaming', 'MP3/Opus/AAC/FLAC/WAV/PCM'],
    notes: 'Uses tts-1 / tts-1-hd / gpt-4o-mini-tts models. API key only — OpenAI does not offer OAuth for API access.'
  },
  {
    providerId: 'elevenlabs',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'xi-...', required: true }
    ],
    docsUrl: 'https://docs.elevenlabs.io/api-reference/text-to-speech',
    signupUrl: 'https://elevenlabs.io',
    pricingUrl: 'https://elevenlabs.io/pricing',
    pricingSummary: 'Free: 10K chars/mo. Creator $22/mo, Pro $99/mo',
    freeTier: '10,000 characters/month',
    features: ['Voice cloning', 'Emotion control', 'Community library', 'Streaming', '29 languages'],
    notes: 'Free tier: 10K chars/month'
  },
  {
    providerId: 'deepgram',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'dg-...', required: true }
    ],
    docsUrl: 'https://developers.deepgram.com/docs/tts-rest',
    signupUrl: 'https://console.deepgram.com/signup',
    pricingUrl: 'https://deepgram.com/pricing',
    pricingSummary: 'Free: $200 credit. Then pay-per-use',
    freeTier: '$200 credit',
    features: ['102 voices', 'Aura 2 model', 'Streaming', 'REST + WebSocket'],
    notes: 'Free tier: $200 credit'
  },
  {
    providerId: 'cartesia',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk_car_...', required: true }
    ],
    docsUrl: 'https://docs.cartesia.ai',
    signupUrl: 'https://cartesia.ai',
    pricingUrl: 'https://cartesia.ai/pricing',
    pricingSummary: 'Free tier available. Pay-per-use at scale',
    freeTier: 'Limited free credits',
    features: ['154 voices', 'Ultra-low latency', 'Real-time streaming', 'WebSocket API', 'Voice mixing'],
    notes: 'Free tier: limited credits'
  },
  {
    providerId: 'lmnt',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'lmnt-...', required: true }
    ],
    docsUrl: 'https://docs.lmnt.com',
    signupUrl: 'https://lmnt.com',
    pricingUrl: 'https://lmnt.com/pricing',
    pricingSummary: 'Free tier available. Usage-based pricing',
    freeTier: 'Free tier available',
    features: ['44 voices', 'Voice cloning', 'Low latency', 'Streaming'],
    notes: 'Free tier available'
  },
  {
    providerId: 'aws-polly',
    authType: 'aws_credentials',
    fields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', placeholder: 'AKIA...', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', placeholder: 'wJalr...', required: true },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1', required: true }
    ],
    docsUrl: 'https://docs.aws.amazon.com/polly/',
    signupUrl: 'https://console.aws.amazon.com/iam/',
    pricingUrl: 'https://aws.amazon.com/polly/pricing/',
    pricingSummary: 'Free: 5M chars/mo (12 months). Then $4/1M (standard), $16/1M (neural)',
    freeTier: '5M characters/month for 12 months',
    features: ['Full SSML + extensions', 'Neural engine', 'Speech marks', 'Lexicons', 'Newscaster style'],
    notes: 'Free tier: 5M chars/month for 12 months'
  },
  {
    providerId: 'azure-speech',
    authType: 'subscription_key',
    fields: [
      { key: 'subscriptionKey', label: 'Subscription Key', type: 'password', placeholder: 'abc123...', required: true },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'eastus', required: true }
    ],
    docsUrl: 'https://learn.microsoft.com/azure/ai-services/speech-service/',
    signupUrl: 'https://portal.azure.com',
    pricingUrl: 'https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/',
    pricingSummary: 'Free: 500K chars/mo. Standard: $16/1M chars',
    freeTier: '500,000 characters/month',
    features: ['Full SSML + extensions', 'Custom neural voice', '140+ languages', 'Viseme support', 'Word timestamps'],
    oauth: {
      provider: 'microsoft',
      label: 'Sign in with Microsoft',
      buttonLabel: 'Sign in with Microsoft',
      scopes: ['https://cognitiveservices.azure.com/.default'],
    },
    notes: 'Free tier: 0.5M chars/month. OAuth available via Microsoft Entra ID.'
  },
  {
    providerId: 'gcp-tts',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIza...', required: true }
    ],
    docsUrl: 'https://cloud.google.com/text-to-speech/docs',
    signupUrl: 'https://console.cloud.google.com/apis/credentials',
    pricingUrl: 'https://cloud.google.com/text-to-speech/pricing',
    pricingSummary: 'Free: 4M chars/mo (standard), 1M (WaveNet). Then $4-$16/1M',
    freeTier: '4M characters/month (standard voices)',
    features: ['WaveNet voices', 'Full SSML', 'Neural2 model', 'Audio profiles', '40+ languages'],
    oauth: {
      provider: 'google',
      label: 'Sign in with Google',
      buttonLabel: 'Sign in with Google',
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    },
    notes: 'Free tier: 4M chars/month (standard), 1M (WaveNet). OAuth sign-in available.'
  },
  {
    providerId: 'gemini-tts',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'Gemini API Key', type: 'password', placeholder: 'AIza...', required: true }
    ],
    docsUrl: 'https://ai.google.dev/gemini-api/docs/text-generation',
    signupUrl: 'https://aistudio.google.com/apikey',
    pricingUrl: 'https://ai.google.dev/pricing',
    pricingSummary: 'Free: 10 req/min. Paid plans for higher throughput',
    freeTier: '10 requests/minute',
    features: ['30 voices', 'High naturalness', 'Multilingual', 'Google AI ecosystem'],
    oauth: {
      provider: 'google',
      label: 'Sign in with Google',
      buttonLabel: 'Sign in with Google',
      scopes: ['https://www.googleapis.com/auth/generative-language'],
    },
    notes: 'Free tier: 10 req/min. OAuth sign-in available.'
  },
  // ─── Free providers ───
  {
    providerId: 'edge-tts',
    authType: 'none',
    fields: [],
    freeProvider: true,
    notes: 'Free Azure Neural TTS via Edge browser API. No key required.'
  },
  // ─── Local/open models ───
  {
    providerId: 'kokoro',
    authType: 'none',
    fields: [],
    freeProvider: true,
    notes: 'Local model via mlx-audio. Run locally on Apple Silicon.'
  },
  {
    providerId: 'bark',
    authType: 'none',
    fields: [],
    freeProvider: true,
    notes: 'Local model via mlx-audio.'
  },
  {
    providerId: 'orpheus',
    authType: 'none',
    fields: [],
    freeProvider: true,
    notes: 'Local model via mlx-audio.'
  },
  {
    providerId: 'dia',
    authType: 'none',
    fields: [],
    freeProvider: true,
    notes: 'Local model via mlx-audio.'
  },
  {
    providerId: 'qwen3-tts',
    authType: 'none',
    fields: [],
    freeProvider: true,
    notes: 'Local model via mlx-audio.'
  },
  {
    providerId: 'kittentts',
    authType: 'none',
    fields: [],
    freeProvider: true,
    notes: 'Local KittenTTS server on port 8200.'
  },
];

/**
 * Get auth config for a provider.
 */
export function getProviderAuthConfig(providerId: string): ProviderAuthConfig | undefined {
  return PROVIDER_AUTH_CONFIGS.find((c) => c.providerId === providerId);
}

/**
 * Check if a provider requires API credentials (API key or OAuth).
 */
export function providerRequiresCredentials(providerId: string): boolean {
  const config = getProviderAuthConfig(providerId);
  if (!config) return false;
  return config.authType !== 'none';
}

/**
 * Get all providers that require credentials (for the account page).
 */
export function getCredentialProviders(): ProviderAuthConfig[] {
  return PROVIDER_AUTH_CONFIGS.filter((c) => c.authType !== 'none');
}

/**
 * Get all free providers.
 */
export function getFreeProviders(): ProviderAuthConfig[] {
  return PROVIDER_AUTH_CONFIGS.filter((c) => c.authType === 'none');
}

/**
 * Get providers that support OAuth sign-in.
 */
export function getOAuthProviders(): ProviderAuthConfig[] {
  return PROVIDER_AUTH_CONFIGS.filter((c) => c.oauth !== undefined);
}

/**
 * Credential data shapes stored in DynamoDB (as JSON string).
 */
export type ApiKeyCredential = { apiKey: string };
export type AwsCredentials = { accessKeyId: string; secretAccessKey: string; region: string };
export type SubscriptionKeyCredential = { subscriptionKey: string; region: string };
export type OAuthTokenCredential = { oauthProvider: string; accessToken: string; expiresAt: number };
export type CredentialData = ApiKeyCredential | AwsCredentials | SubscriptionKeyCredential | OAuthTokenCredential;
