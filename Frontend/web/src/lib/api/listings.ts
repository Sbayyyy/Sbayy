import { api } from '../api';
import type { ProductCreate, ProductUpdate } from '@sbay/shared';

/**
 * Listing erstellen
 */
export const createListing = async (data: ProductCreate) => {
  const response = await api.post('/listings', data);
  return response.data;
};

/**
 * Listing aktualisieren
 */
export const updateListing = async (id: string, data: ProductUpdate) => {
  const response = await api.put(`/listings/${id}`, data);
  return response.data;
};

/**
 * Listing löschen
 */
export const deleteListing = async (id: string) => {
  const response = await api.delete(`/listings/${id}`);
  return response.data;
};

/**
 * Einzelnes Listing abrufen
 */
export const getListingById = async (id: string) => {
  const response = await api.get(`/listings/${id}`);
  return response.data;
};

/**
 * Meine Listings abrufen
 */
export const getMyListings = async () => {
  const response = await api.get('/listings/my-listings');
  return response.data;
};

/**
 * Alle Listings abrufen (mit Pagination)
 */
export const getAllListings = async (page = 1, limit = 20) => {
  const response = await api.get('/listings', {
    params: { page, limit }
  });
  return response.data;
};