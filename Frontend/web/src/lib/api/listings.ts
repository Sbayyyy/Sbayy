import { api } from '../api';
import type { Product, ProductCreate, ProductUpdate, SearchFilters, SearchResponse } from '@sbay/shared';
import { normalizeListingsResponse } from './transforms';

/**
 * Listing erstellen
 */
export const createListing = async (data: ProductCreate): Promise<Product> => {
  const response = await api.post<Product>('/listings', data);
  return response.data;
};

/**
 * Listing aktualisieren
 */
export const updateListing = async (id: string, data: ProductUpdate): Promise<Product> => {
  const response = await api.put<Product>(`/listings/${id}`, data);
  return response.data;
};

export const markListingSold = async (id: string): Promise<Product> => {
  return updateListing(id, { status: 'sold' });
};

export const relistListing = async (id: string): Promise<Product> => {
  return updateListing(id, { status: 'active' });
};

/**
 * Listing löschen
 */
export const deleteListing = async (id: string): Promise<void> => {
  await api.delete(`/listings/${id}`);
};

/**
 * Einzelnes Listing abrufen
 */
export const getListingById = async (id: string): Promise<Product> => {
  const response = await api.get<Product>(`/listings/${id}`);
  return response.data;
};

/**
 * Meine Listings abrufen
 */
export const getMyListings = async (): Promise<Product[]> => {
  const response = await api.get<Product[]>('/listings/me');
  return response.data;
};

export const getListingsBySeller = async (sellerId: string): Promise<Product[]> => {
  const response = await api.get<Product[]>(`/listings/seller/${sellerId}`);
  return response.data;
};

/**
 * Alle Listings abrufen (mit Pagination und Filtern)
 */
const joinCsv = (values?: string[]) => {
  if (!values || values.length === 0) return undefined;
  return values.filter(Boolean).join(',') || undefined;
};

export const getAllListings = async (
  page = 1,
  limit = 20,
  filters?: SearchFilters
): Promise<SearchResponse> => {
  const category = joinCsv(filters?.categories) ?? filters?.category;
  const condition = joinCsv(filters?.conditions) ?? filters?.condition;
  const region = joinCsv(filters?.regions) ?? filters?.region;

  const response = await api.get('/listings', {
    params: {
      page,
      pageSize: limit, // Backend uses 'pageSize' not 'limit'
      category,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
      condition,
      region,
    }
  });

  return normalizeListingsResponse(response.data, page, limit);
};
