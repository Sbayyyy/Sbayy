import { api } from '../api';
import type { Product, ProductCreate, ProductUpdate, SearchFilters, SearchResponse } from '@sbay/shared';

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
  const response = await api.get<Product[]>('/listings/my-listings');
  return response.data;
};

/**
 * Alle Listings abrufen (mit Pagination und Filtern)
 */
export const getAllListings = async (
  page = 1, 
  limit = 20,
  filters?: SearchFilters
): Promise<SearchResponse> => {
  const response = await api.get<any>('/listings', {
    params: { 
      page, 
      pageSize: limit, // Backend uses 'pageSize' not 'limit'
      text: filters?.category, // Backend uses 'text' for search, 'category' for category filter
      category: filters?.category,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
      condition: filters?.condition,
      region: filters?.region,
    }
  });
  
  // Backend should return { items: Product[], total: number } or just Product[]
  // Handle both cases for compatibility
  if (response.data && typeof response.data === 'object') {
    if (Array.isArray(response.data)) {
      // Backend returns array directly
      return {
        items: response.data,
        total: response.data.length, // Can't know real total from single page
        page,
        limit,
        totalPages: 1, // Unknown without total from backend
      };
    } else if (response.data.items && Array.isArray(response.data.items)) {
      // Backend returns { items, total }
      return {
        items: response.data.items,
        total: response.data.total || response.data.items.length,
        page,
        limit,
        totalPages: Math.ceil((response.data.total || response.data.items.length) / limit),
      };
    }
  }
  
  // Fallback
  return {
    items: [],
    total: 0,
    page,
    limit,
    totalPages: 0,
  };
};