import { api } from '../api';
import { revokeStoredRefreshToken } from '../auth-session';
import type { UserLogin, UserRegistration } from '@sbay/shared';
import { toUser, type BackendUserDto } from './transforms';

type AuthResponse = {
  user: BackendUserDto;
  token: string;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: string | null;
};

/**
 * Login
 */
export const login = async (credentials: UserLogin) => {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  return {
    ...response.data,
    user: toUser(response.data.user)
  };
};

/**
 * Authenticates a user with a Google ID token and returns the normal auth response shape.
 *
 * @param idToken - Google identity token returned by Google Identity Services.
 * @param accessToken - Optional Google access token when a client flow provides one.
 * @returns The auth response with the backend user DTO transformed into the web user shape.
 */
export const loginWithGoogle = async (idToken: string, accessToken?: string | null) => {
  const response = await api.post<AuthResponse>('/auth/google', {
    idToken,
    accessToken
  });
  return {
    ...response.data,
    user: toUser(response.data.user)
  };
};

/**
 * Register
 */
export const register = async (data: UserRegistration) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const verifyEmail = async (token: string): Promise<void> => {
  await api.post('/auth/verify-email', {
    token
  });
};

export const requestEmailVerification = async (): Promise<void> => {
  await api.post('/auth/request-email-verification');
};

/**
 * Logout
 */
export const logout = async () => {
  await revokeStoredRefreshToken();
};

/**
 * Forgot Password
 */
export const forgotPassword = async (email: string) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

/**
 * Reset Password
 */
export const resetPassword = async (token: string, newPassword: string) => {
  const response = await api.post('/auth/reset-password', { token, newPassword });
  return response.data;
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const response = await api.post('/auth/change-password', { currentPassword, newPassword });
  return response.data;
};
