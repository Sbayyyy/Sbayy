import { api } from './index';
import { User } from '@sbay/shared';

type BackendUserDto = Omit<User, 'name'> & {
  displayName?: string;
  name?: string;
  avatarUrl?: string;
};

function toUser(dto: BackendUserDto): User {
  return {
    ...dto,
    name: dto.displayName ?? dto.name ?? '',
    avatar: dto.avatar ?? dto.avatarUrl,
  };
}

/**
 * Profile update payload for the current user.
 * @property {string} [displayName] - Updated display name for the user.
 * @property {string} [phone] - Updated phone number for the user.
 * @property {string} [city] - Updated city for the user.
 * @property {string} [avatar] - Updated avatar URL for the user.
 */
export interface UpdateProfileRequest {
  displayName?: string;
  phone?: string;
  city?: string;
  avatar?: string;
}

/**
 * Retrieves the currently authenticated user.
 * @returns {Promise<User>} Current user profile.
 * @throws {Error} When the API request fails.
 */
export async function getCurrentUser(): Promise<User> {
  const response = await api.get<BackendUserDto>('/users/me');
  return toUser(response.data);
}

/**
 * Updates the current user's profile.
 * @param {UpdateProfileRequest} data - Profile fields to update.
 * @returns {Promise<User>} Updated user profile.
 * @throws {Error} When the API request fails.
 */
export async function updateProfile(data: UpdateProfileRequest): Promise<User> {
  const response = await api.put<BackendUserDto>('/users/me', data);
  return toUser(response.data);
}

export interface SellerProfile {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  totalOrders: number;
  city?: string;
  avatar?: string;
  createdAt: string;
}

export async function getSellerProfile(id: string): Promise<SellerProfile> {
  const response = await api.get<SellerProfile>(`/users/${id}`);
  return response.data;
}
