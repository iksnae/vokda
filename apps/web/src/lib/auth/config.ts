export const AUTH_MODE = (import.meta.env.PUBLIC_AUTH_MODE as string | undefined) ?? 'mock';

export const COGNITO_DOMAIN = (import.meta.env.PUBLIC_COGNITO_DOMAIN as string | undefined) ?? '';
export const COGNITO_CLIENT_ID = (import.meta.env.PUBLIC_COGNITO_CLIENT_ID as string | undefined) ?? '';
export const COGNITO_REDIRECT_SIGN_IN =
  (import.meta.env.PUBLIC_COGNITO_REDIRECT_SIGN_IN as string | undefined) ?? '';
export const COGNITO_REDIRECT_SIGN_OUT =
  (import.meta.env.PUBLIC_COGNITO_REDIRECT_SIGN_OUT as string | undefined) ?? '';
export const COGNITO_SCOPES =
  (import.meta.env.PUBLIC_COGNITO_SCOPES as string | undefined) ?? 'openid email profile';
