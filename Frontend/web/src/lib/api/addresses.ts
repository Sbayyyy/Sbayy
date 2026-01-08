import { api } from '../api';
import type { SavedAddress, Address } from '@sbay/shared';

/**
 * Get User's Saved Addresses
 * 
 * Ruft alle gespeicherten Adressen des aktuellen Users ab
 * Backend: GET /api/addresses
 */
export const getMyAddresses = async (): Promise<SavedAddress[]> => {
  try {
    const response = await api.get<SavedAddress[]>('/addresses');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch addresses:', error);
    throw error;
  }
};

/**
 * Get Single Address by ID
 * 
 * Ruft einzelne Adresse ab
 * Backend: GET /api/addresses/:id
 */
export const getAddress = async (id: string): Promise<SavedAddress> => {
  try {
    const response = await api.get<SavedAddress>(`/addresses/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch address ${id}:`, error);
    throw error;
  }
};

/**
 * Create New Address
 * 
 * Erstellt neue Adresse für aktuellen User
 * Backend: POST /api/addresses
 */
export const createAddress = async (address: Address): Promise<SavedAddress> => {
  try {
    const response = await api.post<SavedAddress>('/addresses', address);
    return response.data;
  } catch (error) {
    console.error('Failed to create address:', error);
    throw error;
  }
};

/**
 * Update Existing Address
 * 
 * Aktualisiert existierende Adresse
 * Backend: PUT /api/addresses/:id
 */
export const updateAddress = async (id: string, address: Address): Promise<SavedAddress> => {
  try {
    const response = await api.put<SavedAddress>(`/addresses/${id}`, address);
    return response.data;
  } catch (error) {
    console.error(`Failed to update address ${id}:`, error);
    throw error;
  }
};

/**
 * Delete Address
 * 
 * Löscht Adresse
 * Backend: DELETE /api/addresses/:id
 */
export const deleteAddress = async (id: string): Promise<void> => {
  try {
    await api.delete(`/addresses/${id}`);
  } catch (error) {
    console.error(`Failed to delete address ${id}:`, error);
    throw error;
  }
};
