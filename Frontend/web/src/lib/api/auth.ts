import { api } from '../api';
import type { User, UserLogin, UserRegistration } from '@sbay/shared';

type BackendUserDto = Omit<User, 'name'> & {
  displayName?: string;
  name?: string;
  avatarUrl?: string;
};

type AuthResponse = {
  user: BackendUserDto;
  token: string;
};

const toUser = (dto: BackendUserDto): User => ({
  ...dto,
  name: dto.displayName ?? dto.name ?? '',
  avatar: dto.avatar ?? dto.avatarUrl
});

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
 * Register
 */
export const register = async (data: UserRegistration) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

/**
 * Logout
 */
export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
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
