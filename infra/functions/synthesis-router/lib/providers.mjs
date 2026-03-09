/**
 * Provider catalog for the GET /v1/providers endpoint.
 *
 * Centralizes all provider metadata: display names, auth types,
 * synthesis availability, SSML support, credential formats, and links.
 */

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'cloud_provider',
    websiteUrl: 'https://platform.openai.com/docs/guides/text-to-speech',
    synthesisAvailable: true,
    authType: 'api_key',
    credentialFormat: { apiKey: 'string' },
    ssmlSupport: false,
    voiceIdFormat: 'alloy, echo, fable, nova, onyx, shimmer',
    notes: 'Supports tts-1 and tts-1-hd models. Speed 0.25–4.0.',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    type: 'cloud_provider',
    websiteUrl: 'https://elevenlabs.io',
    synthesisAvailable: true,
    authType: 'api_key',
    credentialFormat: { apiKey: 'string' },
    ssmlSupport: false,
    voiceIdFormat: 'ElevenLabs voice UUID',
    notes: 'Supports multiple models (eleven_multilingual_v2, etc.).',
  },
  {
    id: 'deepgram',
    name: 'Deepgram',
    type: 'cloud_provider',
    websiteUrl: 'https://deepgram.com/aura',
    synthesisAvailable: true,
    authType: 'api_key',
    credentialFormat: { apiKey: 'string' },
    ssmlSupport: false,
    voiceIdFormat: 'Aura voice name (e.g. aura-2-athena-en)',
    notes: 'Aura TTS models.',
  },
  {
    id: 'gemini-tts',
    name: 'Gemini TTS',
    type: 'cloud_provider',
    websiteUrl: 'https://ai.google.dev/gemini-api/docs/speech-generation',
    synthesisAvailable: true,
    authType: 'api_key',
    credentialFormat: { apiKey: 'string' },
    ssmlSupport: false,
    voiceIdFormat: 'Gemini voice name (e.g. Kore, Puck)',
    notes: 'Google Gemini native TTS.',
  },
  {
    id: 'cartesia',
    name: 'Cartesia',
    type: 'cloud_provider',
    websiteUrl: 'https://cartesia.ai',
    synthesisAvailable: true,
    authType: 'api_key',
    credentialFormat: { apiKey: 'string' },
    ssmlSupport: false,
    voiceIdFormat: 'Cartesia voice UUID',
    notes: 'Sonic model. Supports streaming.',
  },
  {
    id: 'lmnt',
    name: 'LMNT',
    type: 'cloud_provider',
    websiteUrl: 'https://lmnt.com',
    synthesisAvailable: true,
    authType: 'api_key',
    credentialFormat: { apiKey: 'string' },
    ssmlSupport: false,
    voiceIdFormat: 'LMNT voice name',
    notes: null,
  },
  {
    id: 'gcp-tts',
    name: 'Google Cloud TTS',
    type: 'cloud_provider',
    websiteUrl: 'https://cloud.google.com/text-to-speech',
    synthesisAvailable: true,
    authType: 'api_key',
    credentialFormat: { apiKey: 'string' },
    ssmlSupport: true,
    voiceIdFormat: 'GCP voice name (e.g. en-US-Wavenet-D)',
    notes: 'Full SSML support. Standard, WaveNet, Neural2, and Studio voices.',
  },
  {
    id: 'azure-speech',
    name: 'Azure Speech',
    type: 'cloud_provider',
    websiteUrl: 'https://azure.microsoft.com/products/ai-services/ai-speech',
    synthesisAvailable: true,
    authType: 'subscription_key',
    credentialFormat: { subscriptionKey: 'string', region: 'string' },
    ssmlSupport: true,
    voiceIdFormat: 'Azure voice name (e.g. en-US-JennyNeural)',
    notes: 'Full SSML + Microsoft extensions. Style and role support on select voices.',
  },
  {
    id: 'aws-polly',
    name: 'AWS Polly',
    type: 'cloud_provider',
    websiteUrl: 'https://aws.amazon.com/polly/',
    synthesisAvailable: true,
    authType: 'aws_credentials',
    credentialFormat: { accessKeyId: 'string', secretAccessKey: 'string', region: 'string' },
    ssmlSupport: true,
    voiceIdFormat: 'Polly voice ID (e.g. Joanna)',
    notes: 'Full SSML + Amazon extensions. Standard and Neural engines.',
  },
  // ─── Providers in catalog but NOT available for server-side synthesis ───
  {
    id: 'edge-tts',
    name: 'Edge TTS',
    type: 'cloud_provider',
    websiteUrl: 'https://github.com/rany2/edge-tts',
    synthesisAvailable: false,
    authType: null,
    credentialFormat: null,
    ssmlSupport: true,
    voiceIdFormat: 'Edge voice name',
    notes: 'Browser-only, no API key needed. Not available via the synthesis API.',
  },
  {
    id: 'kokoro',
    name: 'Kokoro',
    type: 'open_model',
    websiteUrl: 'https://huggingface.co/hexgrad/Kokoro-82M',
    synthesisAvailable: false,
    authType: null,
    credentialFormat: null,
    ssmlSupport: false,
    voiceIdFormat: null,
    notes: 'Run locally via mlx-audio. Not available via the synthesis API.',
  },
  {
    id: 'bark',
    name: 'Bark',
    type: 'open_model',
    websiteUrl: 'https://github.com/suno-ai/bark',
    synthesisAvailable: false,
    authType: null,
    credentialFormat: null,
    ssmlSupport: false,
    voiceIdFormat: null,
    notes: 'Run locally via mlx-audio. Not available via the synthesis API.',
  },
  {
    id: 'orpheus',
    name: 'Orpheus TTS',
    type: 'open_model',
    websiteUrl: 'https://github.com/canopyai/Orpheus-TTS',
    synthesisAvailable: false,
    authType: null,
    credentialFormat: null,
    ssmlSupport: false,
    voiceIdFormat: null,
    notes: 'Run locally via mlx-audio. Not available via the synthesis API.',
  },
  {
    id: 'dia',
    name: 'Dia',
    type: 'open_model',
    websiteUrl: 'https://huggingface.co/nari-labs/Dia-1.6B',
    synthesisAvailable: false,
    authType: null,
    credentialFormat: null,
    ssmlSupport: false,
    voiceIdFormat: null,
    notes: 'Run locally via mlx-audio. Not available via the synthesis API.',
  },
  {
    id: 'qwen3-tts',
    name: 'Qwen3 TTS',
    type: 'open_model',
    websiteUrl: 'https://huggingface.co/Qwen/Qwen3-TTS',
    synthesisAvailable: false,
    authType: null,
    credentialFormat: null,
    ssmlSupport: false,
    voiceIdFormat: null,
    notes: 'Run locally via mlx-audio. Not available via the synthesis API.',
  },
  {
    id: 'kittentts',
    name: 'KittenTTS',
    type: 'open_model',
    websiteUrl: 'https://github.com/KittenML/KittenTTS',
    synthesisAvailable: false,
    authType: null,
    credentialFormat: null,
    ssmlSupport: false,
    voiceIdFormat: null,
    notes: 'Self-hosted on port 8200. Not available via the synthesis API.',
  },
  {
    id: 'chatterbox',
    name: 'Chatterbox',
    type: 'open_model',
    websiteUrl: 'https://huggingface.co/resemble-ai/chatterbox',
    synthesisAvailable: false,
    authType: null,
    credentialFormat: null,
    ssmlSupport: false,
    voiceIdFormat: null,
    notes: 'Run locally. Not available via the synthesis API.',
  },
  {
    id: 'chatterbox-turbo',
    name: 'Chatterbox Turbo',
    type: 'open_model',
    websiteUrl: 'https://huggingface.co/mlx-community/Chatterbox-Turbo-TTS-4bit',
    synthesisAvailable: false,
    authType: null,
    credentialFormat: null,
    ssmlSupport: false,
    voiceIdFormat: null,
    notes: 'Run locally. Not available via the synthesis API.',
  },
];

/**
 * Get all providers.
 * @returns {object[]}
 */
export function getAllProviders() {
  return PROVIDERS;
}

/**
 * Filter providers to those the user has access to:
 * - Cloud providers with active credentials
 * - All open_model providers (no credentials needed)
 * @param {Set<string>} enabledProviderIds - provider IDs the user has active credentials for
 * @returns {object[]}
 */
export function getEnabledProviders(enabledProviderIds) {
  return PROVIDERS.filter(
    p => p.type === 'open_model' || (p.synthesisAvailable && enabledProviderIds.has(p.id))
  );
}

/**
 * Get a single provider by ID.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getProvider(id) {
  return PROVIDERS.find(p => p.id === id);
}
