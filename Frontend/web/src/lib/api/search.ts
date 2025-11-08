import { api } from '../api';
import type { Product, SearchFilters, SearchResponse } from '@sbay/shared';

/**
 * Search for products with filters
 */
export const searchProducts = async (
  query: string, 
  filters?: SearchFilters
): Promise<SearchResponse> => {
  const response = await api.get('/listings/search', {
    params: {
      q: query,
      category: filters?.category,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
      condition: filters?.condition,
      region: filters?.region,
      sortBy: filters?.sortBy || 'date',
      sortOrder: filters?.sortOrder || 'desc',
      page: filters?.page || 1,
      limit: filters?.limit || 20
    }
  });
  
  return response.data;
};

/**
 * Get search suggestions / autocomplete
 */
export const getSearchSuggestions = async (query: string): Promise<string[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await api.get('/listings/search/suggestions', {
      params: { q: query, limit: 5 }
    });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
};