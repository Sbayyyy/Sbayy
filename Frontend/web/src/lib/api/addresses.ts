import { api } from '../api';
import type { SavedAddress, Address } from '@sbay/shared';

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
