import { api } from '../api';
import type { Product, SearchFilters, SearchResponse } from '@sbay/shared';

/**
 * Search for products with filters
 */
export const searchProducts = async (
  query: string, 
  filters?: SearchFilters
): Promise<SearchResponse> => {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const response = await api.get('/listings', {
    params: {
      text: query,
      category: filters?.category,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
      condition: filters?.condition,
      region: filters?.region,
      page,
      pageSize: limit
    }
  });
  
  if (response.data && typeof response.data === 'object') {
    if (Array.isArray(response.data)) {
      return {
        items: response.data,
        total: response.data.length,
        page,
        limit,
        totalPages: 1
      };
    }
    if (response.data.items && Array.isArray(response.data.items)) {
      return {
        items: response.data.items,
        total: response.data.total || response.data.items.length,
        page,
        limit,
        totalPages: Math.ceil((response.data.total || response.data.items.length) / limit)
      };
    }
  }

  return {
    items: [],
    total: 0,
    page,
    limit,
    totalPages: 0
  };
};

/**
 * Get search suggestions / autocomplete
 */
export const getSearchSuggestions = async (query: string): Promise<string[]> => {
  if (!query || query.length < 2) return [];

  return [];
};
