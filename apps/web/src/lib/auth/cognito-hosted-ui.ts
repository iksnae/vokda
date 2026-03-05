import { browser } from '$app/environment';
import {
  COGNITO_CLIENT_ID,
  COGNITO_DOMAIN,
  COGNITO_REDIRECT_SIGN_IN,
  COGNITO_REDIRECT_SIGN_OUT,
  COGNITO_SCOPES
} from './config';
import type { AppRole, AuthState, AuthUser } from './types';

const STORAGE_KEY = 'vokda.auth.session.v1';

type PersistedSession = {
  idToken: string;
  accessToken: string;
  user: AuthUser;
};

function parseJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1] ?? '';
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(base64);
  return JSON.parse(decoded) as Record<string, unknown>;
}

function extractRoles(claims: Record<string, unknown>): AppRole[] {
  const raw = claims['cognito:groups'];
  const groups = Array.isArray(raw) ? raw.map(String) : [];

  const roles: AppRole[] = ['guest'];
  if (groups.includes('guest')) roles.push('guest');
  if (groups.includes('curator')) roles.push('curator');
  if (groups.includes('admin')) roles.push('admin');

  return Array.from(new Set(roles));
}

function userFromToken(idToken: string): AuthUser {
  const claims = parseJwt(idToken);

  return {
    id: String(claims.sub ?? 'unknown-user'),
    email: typeof claims.email === 'string' ? claims.email : undefined,
    name: typeof claims.name === 'string' ? claims.name : undefined,
    roles: extractRoles(claims)
  };
}

export function buildSignInUrl(): string {
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: 'token',
    scope: COGNITO_SCOPES,
    redirect_uri: COGNITO_REDIRECT_SIGN_IN
  });

  return `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

export function buildSignOutUrl(): string {
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    logout_uri: COGNITO_REDIRECT_SIGN_OUT || COGNITO_REDIRECT_SIGN_IN
  });

  return `${COGNITO_DOMAIN}/logout?${params.toString()}`;
}

export function handleHostedUiCallback(): PersistedSession | null {
  if (!browser) return null;
  if (!window.location.hash.includes('id_token=')) return null;

  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const idToken = hashParams.get('id_token');
  const accessToken = hashParams.get('access_token');

  if (!idToken || !accessToken) return null;

  const session: PersistedSession = {
    idToken,
    accessToken,
    user: userFromToken(idToken)
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

  return session;
}

export function readPersistedSession(): PersistedSession | null {
  if (!browser) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

export function clearPersistedSession() {
  if (!browser) return;
  localStorage.removeItem(STORAGE_KEY);
}

export function stateFromSession(session: PersistedSession | null): AuthState {
  if (!session) {
    return {
      isAuthenticated: false,
      isReady: true,
      user: null
    };
  }

  return {
    isAuthenticated: true,
    isReady: true,
    user: session.user,
    idToken: session.idToken,
    accessToken: session.accessToken
  };
}
