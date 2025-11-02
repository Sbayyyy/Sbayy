import { api } from '../api';
import type { UserLogin, UserRegistration } from '@sbay/shared';

/**
 * Login
 */
export const login = async (credentials: UserLogin) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
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