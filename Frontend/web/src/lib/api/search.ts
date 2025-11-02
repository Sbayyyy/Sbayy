import { api } from '../api';
import type { Product } from '@sbay/shared';

/**
 * Suche nach Produkten
 */
export const searchProducts = async (query: string, options?: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  location?: string;
  sortBy?: 'price' | 'date' | 'popular';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) => {
  const response = await api.get('/search', {
    params: {
      q: query,
      ...options
    }
  });
  return response.data;
};