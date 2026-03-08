import { api } from '../api';
import type { SearchFilters, SearchResponse } from '@sbay/shared';
import { normalizeListingsResponse } from './transforms';

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

  return normalizeListingsResponse(response.data, page, limit);
};
