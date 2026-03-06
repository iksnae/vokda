/**
 * Credential store — reactive state for user's provider credentials.
 *
 * Loads credentials from DynamoDB on auth change,
 * registers real synthesis adapters for connected providers.
 */

import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';
import { auth, getAuthSnapshot } from '$lib/auth/store';
import { AUTH_MODE } from '$lib/auth/config';
import type { UserProviderCredential } from '$lib/types';
import type { CredentialData } from '$lib/synthesis/provider-auth';
import {
  listCredentials,
  getCredentialData,
  saveCredential,
  deleteCredential,
  updateCredentialStatus,
} from '$lib/data/credential-store';
import {
  registerCredentialAdapter,
  unregisterCredentialAdapter,
  clearCredentialAdapters,
} from '$lib/synthesis/registry';
import { providerRequiresCredentials } from '$lib/synthesis/provider-auth';
import { hasValidOAuthToken } from '$lib/synthesis/oauth';

type CredentialState = {
  credentials: UserProviderCredential[];
  loading: boolean;
  loaded: boolean;
};

const credentialState = writable<CredentialState>({
  credentials: [],
  loading: false,
  loaded: false,
});

function getSnapshot(): CredentialState {
  let snap: CredentialState = { credentials: [], loading: false, loaded: false };
  credentialState.subscribe((v) => { snap = v; })();
  return snap;
}

/**
 * Load all user credentials from DynamoDB and register synthesis adapters.
 */
async function loadCredentials() {
  if (!browser || AUTH_MODE !== 'amplify') return;
  const authSnap = getAuthSnapshot();
  if (!authSnap.user) return;

  credentialState.update((s) => ({ ...s, loading: true }));

  try {
    const creds = await listCredentials();
    credentialState.set({ credentials: creds, loading: false, loaded: true });

    // Register real adapters for each active credential
    clearCredentialAdapters();
    for (const cred of creds) {
      if (cred.status !== 'active') continue;
      try {
        const data = await getCredentialData(cred.providerId);
        if (data) {
          registerCredentialAdapter(cred.providerId, data);
        }
      } catch (err) {
        console.warn(`[credentials] Failed to load data for ${cred.providerId}:`, err);
      }
    }
  } catch (err) {
    console.warn('[credentials] Failed to load credentials:', err);
    credentialState.update((s) => ({ ...s, loading: false }));
  }
}

// Auto-load credentials when user signs in
if (browser) {
  auth.subscribe(($auth) => {
    if ($auth.isAuthenticated && $auth.user && AUTH_MODE === 'amplify') {
      void loadCredentials();
    } else {
      credentialState.set({ credentials: [], loading: false, loaded: false });
      clearCredentialAdapters();
    }
  });
}

/**
 * Add or update a credential for a provider.
 */
export async function connectProvider(
  providerId: string,
  label: string,
  data: CredentialData
): Promise<UserProviderCredential> {
  if (AUTH_MODE !== 'amplify') {
    throw new Error('Provider credentials require Amplify auth mode. Set PUBLIC_AUTH_MODE=amplify and restart the dev server.');
  }
  const authSnap = getAuthSnapshot();
  if (!authSnap.isAuthenticated || !authSnap.user) {
    throw new Error('You must be signed in to save provider credentials. Please sign in at /account first.');
  }
  const cred = await saveCredential(providerId, label, data);

  // Register the real adapter immediately
  registerCredentialAdapter(providerId, data);

  // Update local state
  credentialState.update((s) => {
    const filtered = s.credentials.filter((c) => c.providerId !== providerId);
    return { ...s, credentials: [...filtered, cred] };
  });

  return cred;
}

/**
 * Test a credential by making a lightweight API call.
 */
export async function testCredential(
  credentialId: string,
  providerId: string,
  data: CredentialData
): Promise<{ success: boolean; message: string }> {
  try {
    // Provider-specific test calls
    switch (providerId) {
      case 'openai': {
        const resp = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${(data as { apiKey: string }).apiKey}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        await updateCredentialStatus(credentialId, 'active');
        return { success: true, message: 'API key verified — models endpoint accessible.' };
      }

      case 'elevenlabs': {
        const resp = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: { 'xi-api-key': (data as { apiKey: string }).apiKey },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        await updateCredentialStatus(credentialId, 'active');
        return { success: true, message: 'API key verified — user endpoint accessible.' };
      }

      case 'deepgram': {
        const resp = await fetch('https://api.deepgram.com/v1/projects', {
          headers: { Authorization: `Token ${(data as { apiKey: string }).apiKey}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        await updateCredentialStatus(credentialId, 'active');
        return { success: true, message: 'API key verified — projects endpoint accessible.' };
      }

      case 'cartesia': {
        const resp = await fetch('https://api.cartesia.ai/voices', {
          headers: {
            'X-API-Key': (data as { apiKey: string }).apiKey,
            'Cartesia-Version': '2024-06-10',
          },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        await updateCredentialStatus(credentialId, 'active');
        return { success: true, message: 'API key verified — voices endpoint accessible.' };
      }

      case 'lmnt': {
        const resp = await fetch('https://api.lmnt.com/v1/ai/voice/list', {
          headers: { 'X-API-Key': (data as { apiKey: string }).apiKey },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        await updateCredentialStatus(credentialId, 'active');
        return { success: true, message: 'API key verified — voice list accessible.' };
      }

      case 'gcp-tts':
      case 'gemini-tts': {
        const endpoint = providerId === 'gemini-tts'
          ? `https://generativelanguage.googleapis.com/v1beta/models?key=${(data as { apiKey: string }).apiKey}`
          : `https://texttospeech.googleapis.com/v1/voices?key=${(data as { apiKey: string }).apiKey}`;
        const resp = await fetch(endpoint);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        await updateCredentialStatus(credentialId, 'active');
        return { success: true, message: 'API key verified.' };
      }

      case 'azure-speech': {
        const creds = data as { subscriptionKey: string; region: string };
        const resp = await fetch(
          `https://${creds.region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
          { headers: { 'Ocp-Apim-Subscription-Key': creds.subscriptionKey } }
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        await updateCredentialStatus(credentialId, 'active');
        return { success: true, message: 'Subscription key verified — voice list accessible.' };
      }

      default:
        return { success: false, message: `No test available for provider "${providerId}".` };
    }
  } catch (err) {
    await updateCredentialStatus(credentialId, 'invalid').catch(() => {});
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message: `Credential test failed: ${msg}` };
  }
}

/**
 * Disconnect a provider (delete credential).
 */
export async function disconnectProvider(credentialId: string, providerId: string): Promise<void> {
  await deleteCredential(credentialId);
  unregisterCredentialAdapter(providerId);
  credentialState.update((s) => ({
    ...s,
    credentials: s.credentials.filter((c) => c.id !== credentialId),
  }));
}

/**
 * Refresh credentials from DynamoDB.
 */
export async function refreshCredentials(): Promise<void> {
  await loadCredentials();
}

// ─── Derived stores ───

export const credentials = derived(credentialState, ($s) => $s.credentials);
export const credentialsLoading = derived(credentialState, ($s) => $s.loading);
export const credentialsLoaded = derived(credentialState, ($s) => $s.loaded);

/**
 * Map of providerId → credential status for quick lookup.
 */
export const connectedProviders = derived(credentialState, ($s) => {
  const map = new Map<string, UserProviderCredential['status']>();
  for (const cred of $s.credentials) {
    map.set(cred.providerId, cred.status);
  }
  return map;
});

/**
 * Check if a specific provider has an active credential.
 */
/**
 * Check if a specific provider has an active credential or OAuth token.
 */
export function isProviderConnected(providerId: string): boolean {
  if (!providerRequiresCredentials(providerId)) return true; // free provider
  // Check OAuth token (in-memory, session-scoped)
  if (hasValidOAuthToken(providerId)) return true;
  // Check stored credential (DynamoDB)
  const snap = getSnapshot();
  return snap.credentials.some(
    (c) => c.providerId === providerId && c.status === 'active'
  );
}
