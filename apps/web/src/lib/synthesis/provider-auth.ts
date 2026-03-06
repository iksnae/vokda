/**
 * Provider authentication requirements.
 *
 * Defines what credentials each provider needs for BYOK synthesis.
 * Three auth types:
 * - 'api_key': Single API key (most providers)
 * - 'aws_credentials': AWS access key + secret + region
 * - 'subscription_key': Azure-style key + region
 * - 'none': Free provider, no credentials needed
 */

export type CredentialField = {
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder: string;
  required: boolean;
};

export type ProviderAuthConfig = {
  providerId: string;
  authType: 'api_key' | 'aws_credentials' | 'subscription_key' | 'none';
  fields: CredentialField[];
  docsUrl?: string;
  oauthAvailable?: boolean;
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
    docsUrl: 'https://platform.openai.com/api-keys',
    notes: 'Uses tts-1 / tts-1-hd / gpt-4o-mini-tts models'
  },
  {
    providerId: 'elevenlabs',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'xi-...', required: true }
    ],
    docsUrl: 'https://elevenlabs.io/app/settings/api-keys',
    notes: 'Free tier: 10K chars/month'
  },
  {
    providerId: 'deepgram',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'dg-...', required: true }
    ],
    docsUrl: 'https://console.deepgram.com/api-keys',
    notes: 'Free tier: $200 credit'
  },
  {
    providerId: 'cartesia',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk_car_...', required: true }
    ],
    docsUrl: 'https://play.cartesia.ai/keys',
    notes: 'Free tier: limited credits'
  },
  {
    providerId: 'lmnt',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'lmnt-...', required: true }
    ],
    docsUrl: 'https://app.lmnt.com/account/api-keys',
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
    oauthAvailable: true,
    notes: 'Free tier: 5M chars/month for 12 months'
  },
  {
    providerId: 'azure-speech',
    authType: 'subscription_key',
    fields: [
      { key: 'subscriptionKey', label: 'Subscription Key', type: 'password', placeholder: 'abc123...', required: true },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'eastus', required: true }
    ],
    docsUrl: 'https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub',
    notes: 'Free tier: 0.5M chars/month'
  },
  {
    providerId: 'gcp-tts',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'AIza...', required: true }
    ],
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
    notes: 'Free tier: 4M chars/month (standard), 1M (WaveNet)'
  },
  {
    providerId: 'gemini-tts',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'Gemini API Key', type: 'password', placeholder: 'AIza...', required: true }
    ],
    docsUrl: 'https://aistudio.google.com/apikey',
    notes: 'Free tier: 10 req/min'
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
 * Returns undefined if provider has no config (treat as unknown/unsupported).
 */
export function getProviderAuthConfig(providerId: string): ProviderAuthConfig | undefined {
  return PROVIDER_AUTH_CONFIGS.find((c) => c.providerId === providerId);
}

/**
 * Check if a provider requires API credentials.
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
 * Credential data shapes stored in DynamoDB (as JSON string in credentialData field).
 */
export type ApiKeyCredential = { apiKey: string };
export type AwsCredentials = { accessKeyId: string; secretAccessKey: string; region: string };
export type SubscriptionKeyCredential = { subscriptionKey: string; region: string };
export type CredentialData = ApiKeyCredential | AwsCredentials | SubscriptionKeyCredential;
