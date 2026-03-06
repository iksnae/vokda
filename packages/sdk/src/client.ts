/**
 * Vokda API Client — zero-dependency, works in Node.js + browser.
 *
 * Two clients:
 *   - VokdaCatalogClient: public catalog (no auth)
 *   - VokdaClient: authenticated synthesis API (extends catalog)
 */

import type {
  Voice,
  VoiceCatalog,
  Provider,
  ProviderList,
  CatalogStats,
  SynthesizeRequest,
  SynthesizeResponse,
  Clip,
  ClipList,
  ClipUpdate,
  ClipDeleted,
  SaveCredentialRequest,
  CredentialSaved,
  CredentialList,
  CredentialTestRequest,
  CredentialTestResult,
  CredentialDeleted,
  ApiKeyCreated,
  ApiKeyList,
  Usage,
  ApiError,
} from './types.js';

// ─── Error ───────────────────────────────────────────────────────────────────

export class VokdaApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.message || body.error);
    this.name = 'VokdaApiError';
  }
}

// ─── Shared fetch helper ─────────────────────────────────────────────────────

async function request<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, init);

  if (!res.ok) {
    let body: ApiError;
    try {
      body = (await res.json()) as ApiError;
    } catch {
      body = { error: `HTTP ${res.status}`, message: res.statusText };
    }
    throw new VokdaApiError(res.status, body);
  }

  return (await res.json()) as T;
}

// ─── Catalog Client (public, no auth) ────────────────────────────────────────

export interface CatalogClientOptions {
  /** Base URL for the catalog API. Default: https://vokda.iksnae.com */
  baseUrl?: string;
}

export class VokdaCatalogClient {
  private readonly base: string;

  constructor(options: CatalogClientOptions = {}) {
    this.base = (options.baseUrl || 'https://vokda.iksnae.com').replace(/\/$/, '');
  }

  /** List all voices in the catalog. */
  async listVoices(): Promise<VoiceCatalog> {
    return request<VoiceCatalog>(`${this.base}/api/v1/voices.json`);
  }

  /** Get a single voice by ID. */
  async getVoice(voiceId: string): Promise<Voice> {
    return request<Voice>(`${this.base}/api/v1/voices/${encodeURIComponent(voiceId)}.json`);
  }

  /** List all providers with capabilities, pricing, and links. */
  async listProviders(): Promise<ProviderList> {
    return request<ProviderList>(`${this.base}/api/v1/providers.json`);
  }

  /** Get a single provider by ID. */
  async getProvider(providerId: string): Promise<Provider | undefined> {
    const list = await this.listProviders();
    return list.providers.find((p) => p.id === providerId);
  }

  /** Get catalog statistics. */
  async getStats(): Promise<CatalogStats> {
    return request<CatalogStats>(`${this.base}/api/v1/stats.json`);
  }
}

// ─── Authenticated Client ────────────────────────────────────────────────────

export interface VokdaClientOptions extends CatalogClientOptions {
  /** Vokda API key (`vk_live_...`) or Cognito JWT. */
  apiKey: string;
  /** Base URL for the synthesis API. Default: https://api.vokda.iksnae.com */
  synthesisBaseUrl?: string;
}

export class VokdaClient extends VokdaCatalogClient {
  private readonly apiBase: string;
  private readonly headers: Record<string, string>;

  constructor(options: VokdaClientOptions) {
    super(options);
    this.apiBase = (options.synthesisBaseUrl || 'https://api.vokda.iksnae.com').replace(/\/$/, '');
    this.headers = {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private authRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const init: RequestInit = { method, headers: this.headers };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    return request<T>(`${this.apiBase}${path}`, init);
  }

  // ── Synthesis ──

  /** Synthesize speech from text or SSML. Returns clip with audio URL. */
  async synthesize(req: SynthesizeRequest): Promise<SynthesizeResponse> {
    return this.authRequest<SynthesizeResponse>('POST', '/v1/synthesize', req);
  }

  // ── Clips ──

  /** List audio clips. */
  async listClips(options?: { limit?: number; status?: string }): Promise<ClipList> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.status) params.set('status', options.status);
    const qs = params.toString();
    return this.authRequest<ClipList>('GET', `/v1/jobs${qs ? '?' + qs : ''}`);
  }

  /** Get a clip by ID (refreshes presigned audio URL). */
  async getClip(id: string): Promise<Clip> {
    return this.authRequest<Clip>('GET', `/v1/jobs/${encodeURIComponent(id)}`);
  }

  /** Update clip metadata (name, description, tags). */
  async updateClip(id: string, update: ClipUpdate): Promise<Clip> {
    return this.authRequest<Clip>('PATCH', `/v1/jobs/${encodeURIComponent(id)}`, update);
  }

  /** Delete a clip and its audio file. */
  async deleteClip(id: string): Promise<ClipDeleted> {
    return this.authRequest<ClipDeleted>('DELETE', `/v1/jobs/${encodeURIComponent(id)}`);
  }

  // ── Credentials ──

  /** Store or update a provider credential (BYOK). */
  async saveCredential(req: SaveCredentialRequest): Promise<CredentialSaved> {
    return this.authRequest<CredentialSaved>('POST', '/v1/credentials', req);
  }

  /** List all stored credentials (keys are masked). */
  async listCredentials(): Promise<CredentialList> {
    return this.authRequest<CredentialList>('GET', '/v1/credentials');
  }

  /** Test a credential without storing it (dry-run synthesis). */
  async testCredential(req: CredentialTestRequest): Promise<CredentialTestResult> {
    return this.authRequest<CredentialTestResult>('POST', '/v1/credentials/test', req);
  }

  /** Remove a stored provider credential. */
  async deleteCredential(providerId: string): Promise<CredentialDeleted> {
    return this.authRequest<CredentialDeleted>('DELETE', `/v1/credentials/${encodeURIComponent(providerId)}`);
  }

  // ── API Keys ──

  /** Create a new Vokda API key. The full key is returned only once. */
  async createApiKey(label?: string): Promise<ApiKeyCreated> {
    return this.authRequest<ApiKeyCreated>('POST', '/v1/keys', label ? { label } : {});
  }

  /** List all API keys (values masked). */
  async listApiKeys(): Promise<ApiKeyList> {
    return this.authRequest<ApiKeyList>('GET', '/v1/keys');
  }

  /** Revoke an API key by ID. */
  async revokeApiKey(id: string): Promise<void> {
    await this.authRequest<unknown>('DELETE', `/v1/keys/${encodeURIComponent(id)}`);
  }

  // ── Usage ──

  /** Get storage usage and quota. */
  async getUsage(): Promise<Usage> {
    return this.authRequest<Usage>('GET', '/v1/media/usage');
  }
}
