import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import {
  AUTH_MODE,
  COGNITO_CLIENT_ID,
  COGNITO_DOMAIN,
  COGNITO_REDIRECT_SIGN_IN,
  COGNITO_REDIRECT_SIGN_OUT
} from './config';
import {
  buildSignInUrl,
  buildSignOutUrl,
  clearPersistedSession,
  handleHostedUiCallback,
  readPersistedSession,
  stateFromSession
} from './cognito-hosted-ui';
import type { AppRole, AuthState } from './types';

const initialMockState: AuthState = {
  isAuthenticated: false,
  isReady: true,
  user: null
};

const authState = writable<AuthState>(initialMockState);

function hasHostedUiConfig() {
  return Boolean(COGNITO_DOMAIN && COGNITO_CLIENT_ID && COGNITO_REDIRECT_SIGN_IN);
}

export function initAuth() {
  if (!browser) return;

  if (AUTH_MODE !== 'amplify') {
    authState.set(initialMockState);
    return;
  }

  if (!hasHostedUiConfig()) {
    authState.set(initialMockState);
    return;
  }

  const callbackSession = handleHostedUiCallback();
  if (callbackSession) {
    authState.set(stateFromSession(callbackSession));
    return;
  }

  authState.set(stateFromSession(readPersistedSession()));
}

export function signIn() {
  if (!browser) return;

  if (AUTH_MODE !== 'amplify' || !hasHostedUiConfig()) {
    authState.set({
      isAuthenticated: true,
      isReady: true,
      user: {
        id: 'mock-user',
        email: 'mock@local.dev',
        name: 'Mock User',
        roles: ['guest']
      }
    });
    return;
  }

  window.location.assign(buildSignInUrl());
}

export function signOut() {
  if (!browser) return;

  clearPersistedSession();

  if (AUTH_MODE === 'amplify' && hasHostedUiConfig()) {
    authState.set(initialMockState);
    window.location.assign(buildSignOutUrl());
    return;
  }

  authState.set(initialMockState);
}

export function setMockRole(role: AppRole) {
  if (AUTH_MODE === 'amplify') return;

  authState.update((state) => {
    if (!state.user) return state;

    const roles = Array.from(new Set(['guest', role] as AppRole[]));

    return {
      ...state,
      user: {
        ...state.user,
        roles
      }
    };
  });
}

export const auth = {
  subscribe: authState.subscribe
};

export function getAuthSnapshot(): AuthState {
  let snapshot: AuthState = {
    isAuthenticated: false,
    isReady: true,
    user: null
  };

  authState.subscribe((value) => {
    snapshot = value;
  })();

  return snapshot;
}

export const currentUser = derived(authState, ($auth) => $auth.user);
export const isAuthenticated = derived(authState, ($auth) => $auth.isAuthenticated);
export const isAuthReady = derived(authState, ($auth) => $auth.isReady);

export const roleFlags = derived(authState, ($auth) => {
  const roles = $auth.user?.roles ?? [];
  return {
    isVisitor: !roles.length,
    isGuest: roles.includes('guest') || roles.includes('curator') || roles.includes('admin'),
    isCurator: roles.includes('curator') || roles.includes('admin'),
    isAdmin: roles.includes('admin')
  };
});

export function canAccess(role: AppRole, roles: AppRole[]): boolean {
  if (role === 'visitor') return true;
  if (role === 'guest') return roles.includes('guest') || roles.includes('curator') || roles.includes('admin');
  if (role === 'curator') return roles.includes('curator') || roles.includes('admin');
  return roles.includes('admin');
}

export function authDebugConfig() {
  return {
    mode: AUTH_MODE,
    configured: hasHostedUiConfig(),
    domain: COGNITO_DOMAIN,
    redirectSignIn: COGNITO_REDIRECT_SIGN_IN,
    redirectSignOut: COGNITO_REDIRECT_SIGN_OUT
  };
}
