import { api } from '../api';
import type { Product } from '@sbay/shared';


export const getFavorites = async (): Promise<Product[]> => {
  const response = await api.get<Product[]>('/favorites');
  return response.data;
};


export const addFavorite = async (productId: string): Promise<void> => {
  await api.post(`/favorites/${productId}`);
};


export const removeFavorite = async (productId: string): Promise<void> => {
  await api.delete(`/favorites/${productId}`);
};
