/**
 * OAuth integration for TTS providers.
 *
 * Supports OAuth 2.0 token flows for providers that allow it:
 * - Google (GCP TTS + Gemini TTS) — Google Identity Services
 * - Microsoft (Azure Speech) — MSAL.js
 *
 * OAuth tokens are short-lived (~1 hour) and stored in memory only.
 * When a token expires the user re-authenticates with one click.
 *
 * Environment variables:
 *   PUBLIC_GOOGLE_OAUTH_CLIENT_ID  — Google Cloud OAuth 2.0 client ID
 *   PUBLIC_AZURE_OAUTH_CLIENT_ID   — Azure AD / Entra app registration client ID
 */

import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';

// ─── Types ───

export type OAuthProvider = 'google' | 'microsoft';

export type OAuthToken = {
  provider: OAuthProvider;
  accessToken: string;
  expiresAt: number; // epoch ms
  scopes: string[];
  email?: string;
};

export type OAuthConfig = {
  provider: OAuthProvider;
  clientId: string;
  scopes: string[];
  /** Which TTS providers this OAuth token can authenticate */
  coversProviders: string[];
};

// ─── Configuration ───

const GOOGLE_CLIENT_ID = browser
  ? (import.meta.env.PUBLIC_GOOGLE_OAUTH_CLIENT_ID as string | undefined) ?? ''
  : '';

const AZURE_CLIENT_ID = browser
  ? (import.meta.env.PUBLIC_AZURE_OAUTH_CLIENT_ID as string | undefined) ?? ''
  : '';

export const OAUTH_CONFIGS: OAuthConfig[] = [
  {
    provider: 'google',
    clientId: GOOGLE_CLIENT_ID,
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform', // GCP TTS
    ],
    coversProviders: ['gcp-tts', 'gemini-tts'],
  },
  {
    provider: 'microsoft',
    clientId: AZURE_CLIENT_ID,
    scopes: [
      'https://cognitiveservices.azure.com/.default',
    ],
    coversProviders: ['azure-speech'],
  },
];

/**
 * Get OAuth configs that are actually configured (have client IDs).
 */
export function getAvailableOAuthConfigs(): OAuthConfig[] {
  return OAUTH_CONFIGS.filter((c) => c.clientId.length > 0);
}

/**
 * Check if OAuth is available for a specific TTS provider.
 */
export function getOAuthForProvider(providerId: string): OAuthConfig | undefined {
  return getAvailableOAuthConfigs().find((c) => c.coversProviders.includes(providerId));
}

// ─── Token Store (in-memory only — tokens expire in ~1 hour) ───

const tokenStore = writable<Map<OAuthProvider, OAuthToken>>(new Map());

export const oauthTokens = derived(tokenStore, ($store) => $store);

export function getOAuthToken(provider: OAuthProvider): OAuthToken | undefined {
  let token: OAuthToken | undefined;
  tokenStore.subscribe(($store) => {
    const t = $store.get(provider);
    if (t && t.expiresAt > Date.now()) {
      token = t;
    }
  })();
  return token;
}

export function setOAuthToken(token: OAuthToken): void {
  tokenStore.update(($store) => {
    const next = new Map($store);
    next.set(token.provider, token);
    return next;
  });
}

export function clearOAuthToken(provider: OAuthProvider): void {
  tokenStore.update(($store) => {
    const next = new Map($store);
    next.delete(provider);
    return next;
  });
}

/**
 * Check if we have a valid (non-expired) OAuth token for a TTS provider.
 */
export function hasValidOAuthToken(providerId: string): boolean {
  const config = getOAuthForProvider(providerId);
  if (!config) return false;
  const token = getOAuthToken(config.provider);
  return token !== undefined;
}

/**
 * Get the access token string for a TTS provider (if available).
 */
export function getAccessTokenForProvider(providerId: string): string | null {
  const config = getOAuthForProvider(providerId);
  if (!config) return null;
  const token = getOAuthToken(config.provider);
  return token?.accessToken ?? null;
}

// ─── Google OAuth (Google Identity Services) ───

type GoogleTokenClient = {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
};

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: { type: string; message: string }) => void;
          }) => GoogleTokenClient;
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

let googleScriptLoaded = false;
let googleScriptLoading = false;

async function loadGoogleIdentityServices(): Promise<void> {
  if (googleScriptLoaded) return;
  if (googleScriptLoading) {
    // Wait for existing load
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (googleScriptLoaded) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  googleScriptLoading = true;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleScriptLoaded = true;
      googleScriptLoading = false;
      resolve();
    };
    script.onerror = () => {
      googleScriptLoading = false;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Initiate Google OAuth sign-in.
 * Opens Google consent screen, returns token on success.
 */
export async function signInWithGoogle(): Promise<OAuthToken> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      'Google OAuth not configured. Set PUBLIC_GOOGLE_OAUTH_CLIENT_ID in .env'
    );
  }

  await loadGoogleIdentityServices();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services failed to initialize');
  }

  const config = OAUTH_CONFIGS.find((c) => c.provider === 'google');
  if (!config) throw new Error('Google OAuth config not found');

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: config.scopes.join(' '),
      callback: (response: GoogleTokenResponse) => {
        if (response.error) {
          reject(new Error(`Google OAuth error: ${response.error}`));
          return;
        }

        const token: OAuthToken = {
          provider: 'google',
          accessToken: response.access_token,
          expiresAt: Date.now() + response.expires_in * 1000,
          scopes: response.scope.split(' '),
        };

        setOAuthToken(token);
        resolve(token);
      },
      error_callback: (error) => {
        reject(new Error(`Google OAuth error: ${error.message}`));
      },
    });

    client.requestAccessToken();
  });
}

/**
 * Revoke Google OAuth token and clear from store.
 */
export function signOutGoogle(): void {
  const token = getOAuthToken('google');
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token.accessToken);
  }
  clearOAuthToken('google');
}

// ─── Microsoft OAuth (MSAL.js) ───

type MsalInstance = {
  loginPopup: (request: { scopes: string[] }) => Promise<{
    accessToken: string;
    expiresOn: Date;
    account: { username: string };
  }>;
  acquireTokenSilent: (request: {
    scopes: string[];
    account: unknown;
  }) => Promise<{
    accessToken: string;
    expiresOn: Date;
  }>;
  getAllAccounts: () => Array<{ username: string }>;
  logoutPopup: () => Promise<void>;
};

declare global {
  interface Window {
    msal?: {
      PublicClientApplication: new (config: {
        auth: { clientId: string; authority: string; redirectUri: string };
        cache: { cacheLocation: string };
      }) => MsalInstance;
    };
  }
}

let msalInstance: MsalInstance | null = null;
let msalScriptLoaded = false;

async function loadMsal(): Promise<void> {
  if (msalScriptLoaded) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      'https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js';
    script.async = true;
    script.onload = () => {
      msalScriptLoaded = true;
      resolve();
    };
    script.onerror = () =>
      reject(new Error('Failed to load MSAL.js'));
    document.head.appendChild(script);
  });
}

function getMsalInstance(): MsalInstance {
  if (msalInstance) return msalInstance;

  if (!window.msal?.PublicClientApplication) {
    throw new Error('MSAL.js not loaded');
  }

  msalInstance = new window.msal.PublicClientApplication({
    auth: {
      clientId: AZURE_CLIENT_ID,
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: window.location.origin,
    },
    cache: {
      cacheLocation: 'sessionStorage',
    },
  });

  return msalInstance;
}

/**
 * Initiate Microsoft OAuth sign-in.
 * Opens Microsoft login popup, returns token on success.
 */
export async function signInWithMicrosoft(): Promise<OAuthToken> {
  if (!AZURE_CLIENT_ID) {
    throw new Error(
      'Azure OAuth not configured. Set PUBLIC_AZURE_OAUTH_CLIENT_ID in .env'
    );
  }

  await loadMsal();

  const config = OAUTH_CONFIGS.find((c) => c.provider === 'microsoft');
  if (!config) throw new Error('Microsoft OAuth config not found');

  const instance = getMsalInstance();

  const result = await instance.loginPopup({
    scopes: config.scopes,
  });

  const token: OAuthToken = {
    provider: 'microsoft',
    accessToken: result.accessToken,
    expiresAt: result.expiresOn.getTime(),
    scopes: config.scopes,
    email: result.account.username,
  };

  setOAuthToken(token);
  return token;
}

/**
 * Sign out of Microsoft and clear token.
 */
export async function signOutMicrosoft(): Promise<void> {
  if (msalInstance) {
    try {
      await msalInstance.logoutPopup();
    } catch {
      // ignore
    }
  }
  clearOAuthToken('microsoft');
}

// ─── Unified API ───

/**
 * Sign in with the given OAuth provider.
 */
export async function oauthSignIn(provider: OAuthProvider): Promise<OAuthToken> {
  switch (provider) {
    case 'google':
      return signInWithGoogle();
    case 'microsoft':
      return signInWithMicrosoft();
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

/**
 * Sign out of the given OAuth provider.
 */
export async function oauthSignOut(provider: OAuthProvider): Promise<void> {
  switch (provider) {
    case 'google':
      signOutGoogle();
      break;
    case 'microsoft':
      await signOutMicrosoft();
      break;
  }
}

/**
 * Get human-readable label for an OAuth provider.
 */
export function oauthProviderLabel(provider: OAuthProvider): string {
  switch (provider) {
    case 'google':
      return 'Google';
    case 'microsoft':
      return 'Microsoft';
    default:
      return provider;
  }
}
