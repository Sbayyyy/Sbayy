import { api } from '../api';

export interface AdminUser {
  id: string;
  email: string;
  displayName?: string | null;
  role: string;
  status: string;
  isSeller: boolean;
  createdAt: string;
  deactivatedAt?: string | null;
  listingBanned: boolean;
  listingBanUntil?: string | null;
  listingLimit?: number | null;
  listingLimitCount: number;
}

export interface AdminListing {
  id: string;
  sellerId: string;
  sellerEmail?: string | null;
  title: string;
  status: string;
  priceAmount: number;
  priceCurrency: string;
  stock: number;
  categoryPath?: string | null;
  region?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export async function getAdminUsers(params?: { q?: string; role?: string; status?: string; take?: number; skip?: number }) {
  const response = await api.get<AdminUser[]>('/admin/users', { params });
  return response.data;
}

export async function banAdminUser(id: string) {
  const response = await api.post<AdminUser>(`/admin/users/${id}/ban`);
  return response.data;
}

export async function unbanAdminUser(id: string) {
  const response = await api.post<AdminUser>(`/admin/users/${id}/unban`);
  return response.data;
}

export async function deleteAdminUser(id: string) {
  await api.delete(`/admin/users/${id}`);
}

export async function getAdminListings(params?: { q?: string; status?: string; sellerId?: string; take?: number; skip?: number }) {
  const response = await api.get<AdminListing[]>('/admin/listings', { params });
  return response.data;
}

export async function updateAdminListingStatus(id: string, status: 'active' | 'sold' | 'hidden' | 'deleted') {
  const response = await api.patch<AdminListing>(`/admin/listings/${id}/status`, { status });
  return response.data;
}

export async function deleteAdminListing(id: string) {
  await api.delete(`/admin/listings/${id}`);
}
