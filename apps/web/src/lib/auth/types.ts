export type AppRole = 'visitor' | 'guest' | 'curator' | 'admin';

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  roles: AppRole[];
};

export type AuthState = {
  isAuthenticated: boolean;
  isReady: boolean;
  user: AuthUser | null;
  idToken?: string;
  accessToken?: string;
};
