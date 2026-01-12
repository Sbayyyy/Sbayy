import { api } from './index';
import { User } from '@sbay/shared';

/**
 * Profile update payload for the current user.
 * @property {string} [name] - Updated display name for the user.
 * @property {string} [phone] - Updated phone number for the user.
 */
export interface UpdateProfileRequest {
  displayName?: string;
  phone?: string;
}

/**
 * Retrieves the currently authenticated user.
 * @returns {Promise<User>} Current user profile.
 * @throws {Error} When the API request fails.
 */
export async function getCurrentUser(): Promise<User> {
  const response = await api.get<User>('/users/me');
  return response.data;
}

/**
 * Updates the current user's profile.
 * @param {UpdateProfileRequest} data - Profile fields to update.
 * @returns {Promise<User>} Updated user profile.
 * @throws {Error} When the API request fails.
 */
export async function updateProfile(data: UpdateProfileRequest): Promise<User> {
  const response = await api.put<User>('/users/me', data);
  return response.data;
}
