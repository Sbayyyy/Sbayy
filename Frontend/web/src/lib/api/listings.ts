import { api } from '../api';
import type { Product, ProductCreate, ProductUpdate } from '@sbay/shared';

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
 * Alle Listings abrufen (mit Pagination)
 */
export const getAllListings = async (page = 1, limit = 20): Promise<{ items: Product[] }> => {
  const response = await api.get<Product[]>('/listings', {
    params: { page, limit }
  });
  
  return {
    items: response.data,
  };
};