import { api } from '../api';
import type { Address, SavedAddress } from '@sbay/shared';

/**
 * Retrieves the current user's saved addresses.
 * @returns {Promise<SavedAddress[]>} Resolves with the saved addresses list.
 * @throws {Error} When the API request fails.
 */
export const getMyAddresses = async (): Promise<SavedAddress[]> => {
  try {
    const { data } = await api.get<SavedAddress[]>('/addresses');
    return data;
  } catch (error) {
    console.error('Failed to load addresses:', error);
    throw error;
  }
};

/**
 * Retrieves a saved address by ID.
 * @param {string} id - Address identifier.
 * @returns {Promise<SavedAddress>} Resolves with the requested address.
 * @throws {Error} When the API request fails.
 */
export const getAddress = async (id: string): Promise<SavedAddress> => {
  try {
    const { data } = await api.get<SavedAddress>(`/addresses/${id}`);
    return data;
  } catch (error) {
    console.error(`Failed to load address ${id}:`, error);
    throw error;
  }
};

/**
 * Creates a new saved address for the current user.
 * @param {Address} address - Address details to create.
 * @returns {Promise<SavedAddress>} Resolves with the created address.
 * @throws {Error} When the API request fails.
 */
export const createAddress = async (address: Address): Promise<SavedAddress> => {
  try {
    const { data } = await api.post<SavedAddress>('/addresses', address);
    return data;
  } catch (error) {
    console.error('Failed to create address:', error);
    throw error;
  }
};

/**
 * Updates an existing saved address.
 * @param {string} id - Address identifier.
 * @param {Address} address - Updated address details.
 * @returns {Promise<SavedAddress>} Resolves with the updated address.
 * @throws {Error} When the API request fails.
 */
export const updateAddress = async (id: string, address: Address): Promise<SavedAddress> => {
  try {
    const { data } = await api.put<SavedAddress>(`/addresses/${id}`, address);
    return data;
  } catch (error) {
    console.error(`Failed to update address ${id}:`, error);
    throw error;
  }
};

/**
 * Deletes a saved address by ID.
 * @param {string} id - Address identifier.
 * @returns {Promise<void>} Resolves when deletion succeeds.
 * @throws {Error} When the API request fails.
 */
export const deleteAddress = async (id: string): Promise<void> => {
  try {
    await api.delete(`/addresses/${id}`);
  } catch (error) {
    console.error(`Failed to delete address ${id}:`, error);
    throw error;
  }
};
