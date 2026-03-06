import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import { AUTH_MODE } from './config';
import type { AppRole, AuthState, AuthUser } from './types';
import { ensureAmplifyConfigured } from './amplify-client';
import {
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  resendSignUpCode,
  resetPassword as amplifyResetPassword,
  confirmResetPassword as amplifyConfirmResetPassword,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp
} from 'aws-amplify/auth';

type AuthResult = {
  success: boolean;
  message: string;
  needsConfirmation?: boolean;
};

const initialMockState: AuthState = {
  isAuthenticated: false,
  isReady: true,
  user: null
};

const initialAmplifyState: AuthState = {
  isAuthenticated: false,
  isReady: false,
  user: null
};

const authState = writable<AuthState>(AUTH_MODE === 'amplify' ? initialAmplifyState : initialMockState);

function extractRoles(rawGroups: unknown): AppRole[] {
  const groups = Array.isArray(rawGroups) ? rawGroups.map(String) : [];
  const roles: AppRole[] = ['guest'];

  if (groups.includes('curator')) roles.push('curator');
  if (groups.includes('admin')) roles.push('admin');

  return Array.from(new Set(roles));
}

function authenticatedState(user: AuthUser, idToken?: string, accessToken?: string): AuthState {
  return {
    isAuthenticated: true,
    isReady: true,
    user,
    idToken,
    accessToken
  };
}

function unauthenticatedState(): AuthState {
  return {
    isAuthenticated: false,
    isReady: true,
    user: null
  };
}

async function refreshAmplifySession(forceRefresh = false) {
  ensureAmplifyConfigured();

  try {
    const [currentUser, session] = await Promise.all([
      getCurrentUser(),
      fetchAuthSession({ forceRefresh })
    ]);
    const idPayload = session.tokens?.idToken?.payload;
    const accessPayload = session.tokens?.accessToken?.payload;

    const groupClaims = [
      ...(Array.isArray(idPayload?.['cognito:groups']) ? idPayload?.['cognito:groups'] : []),
      ...(Array.isArray(accessPayload?.['cognito:groups']) ? accessPayload?.['cognito:groups'] : [])
    ];

    const user: AuthUser = {
      id: currentUser.userId,
      email: typeof idPayload?.email === 'string' ? idPayload.email : undefined,
      name: typeof idPayload?.name === 'string' ? idPayload.name : undefined,
      roles: extractRoles(groupClaims)
    };

    authState.set(
      authenticatedState(
        user,
        session.tokens?.idToken?.toString(),
        session.tokens?.accessToken?.toString()
      )
    );
  } catch {
    authState.set(unauthenticatedState());
  }
}

export async function initAuth() {
  if (!browser) return;

  if (AUTH_MODE !== 'amplify') {
    authState.set(initialMockState);
    return;
  }

  authState.set(initialAmplifyState);
  await refreshAmplifySession(true);
}

export async function refreshAuthRoles() {
  if (!browser || AUTH_MODE !== 'amplify') return;
  await refreshAmplifySession(true);
}

export function signIn() {
  if (!browser) return;

  if (AUTH_MODE !== 'amplify') {
    authState.set(
      authenticatedState({
        id: 'mock-user',
        email: 'mock@local.dev',
        name: 'Mock User',
        roles: ['guest']
      })
    );
    return;
  }

  window.location.assign('/account?intent=signin');
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!browser) {
    return { success: false, message: 'Sign-in is only available in browser context.' };
  }

  if (AUTH_MODE !== 'amplify') {
    signIn();
    return { success: true, message: 'Signed in with mock account.' };
  }

  ensureAmplifyConfigured();

  try {
    const result = await amplifySignIn({ username: email, password });

    if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
      return {
        success: false,
        needsConfirmation: true,
        message: 'Account requires email confirmation before sign-in.'
      };
    }

    if (result.isSignedIn) {
      await refreshAmplifySession(true);
      return { success: true, message: 'Signed in successfully.' };
    }

    return {
      success: false,
      message: `Additional sign-in step required: ${result.nextStep.signInStep}`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sign-in failed.';
    return { success: false, message };
  }
}

export async function signUpWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!browser) {
    return { success: false, message: 'Sign-up is only available in browser context.' };
  }

  if (AUTH_MODE !== 'amplify') {
    return { success: false, message: 'Sign-up is disabled in mock auth mode.' };
  }

  ensureAmplifyConfigured();

  try {
    const result = await amplifySignUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email
        }
      }
    });

    if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
      return {
        success: true,
        needsConfirmation: true,
        message: 'Verification code sent. Confirm your email to finish setup.'
      };
    }

    return { success: true, message: 'Account created. You can sign in now.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sign-up failed.';
    return { success: false, message };
  }
}

export async function confirmSignUpWithCode(email: string, code: string): Promise<AuthResult> {
  if (!browser) {
    return { success: false, message: 'Confirmation is only available in browser context.' };
  }

  if (AUTH_MODE !== 'amplify') {
    return { success: false, message: 'Confirmation is disabled in mock auth mode.' };
  }

  ensureAmplifyConfigured();

  try {
    await confirmSignUp({ username: email, confirmationCode: code });
    return { success: true, message: 'Email confirmed. You can now sign in.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Confirmation failed.';
    return { success: false, message };
  }
}

export async function resendSignUpConfirmation(email: string): Promise<AuthResult> {
  if (!browser) {
    return { success: false, message: 'Resend is only available in browser context.' };
  }

  if (AUTH_MODE !== 'amplify') {
    return { success: false, message: 'Resend is disabled in mock auth mode.' };
  }

  ensureAmplifyConfigured();

  try {
    await resendSignUpCode({ username: email });
    return { success: true, message: 'New confirmation code sent.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resend code.';
    return { success: false, message };
  }
}

export async function resetPasswordRequest(email: string): Promise<AuthResult> {
  if (!browser) {
    return { success: false, message: 'Password reset is only available in browser context.' };
  }

  if (AUTH_MODE !== 'amplify') {
    return { success: false, message: 'Password reset is disabled in mock auth mode.' };
  }

  ensureAmplifyConfigured();

  try {
    const result = await amplifyResetPassword({ username: email });

    if (result.nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
      return {
        success: true,
        needsConfirmation: true,
        message: 'Reset code sent to your email. Enter it below with your new password.'
      };
    }

    return { success: true, message: 'Password reset initiated.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password reset failed.';
    return { success: false, message };
  }
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string
): Promise<AuthResult> {
  if (!browser) {
    return { success: false, message: 'Password reset is only available in browser context.' };
  }

  if (AUTH_MODE !== 'amplify') {
    return { success: false, message: 'Password reset is disabled in mock auth mode.' };
  }

  ensureAmplifyConfigured();

  try {
    await amplifyConfirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword
    });
    return { success: true, message: 'Password reset successfully. You can now sign in.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password reset confirmation failed.';
    return { success: false, message };
  }
}

export async function signOut() {
  if (!browser) return;

  if (AUTH_MODE === 'amplify') {
    ensureAmplifyConfigured();

    try {
      await amplifySignOut();
    } catch {
      // fall through and clear local state
    }
  }

  authState.set(unauthenticatedState());
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
  let snapshot: AuthState = unauthenticatedState();

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
    provider: AUTH_MODE === 'amplify' ? 'amazon-cognito-user-pools' : 'mock'
  };
}
