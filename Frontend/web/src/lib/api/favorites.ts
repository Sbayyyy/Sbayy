import { api } from '../api';
import type { Product } from '@sbay/shared';


export const getFavorites = async (): Promise<Product[]> => {
  try {
    const response = await api.get<Product[]>('/favorites');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch favorites:', error);
    throw error;
  }
};


export const addFavorite = async (productId: string): Promise<void> => {
  try {
    await api.post(`/favorites/${productId}`);
  } catch (error) {
    console.error('Failed to add favorite:', error);
    throw error;
  }
};


export const removeFavorite = async (productId: string): Promise<void> => {
  try {
    await api.delete(`/favorites/${productId}`);
  } catch (error) {
    console.error('Failed to remove favorite:', error);
    throw error;
  }
};
