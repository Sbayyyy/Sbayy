import { api } from './index';
import { User } from '@sbay/shared';

export interface UpdateProfileRequest {
  displayName?: string;
  phone?: string;
}

export async function getCurrentUser(): Promise<User> {
  const response = await api.get<User>('/users/me');
  return response.data;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<User> {
  const response = await api.put<User>('/users/me', data);
  return response.data;
}
