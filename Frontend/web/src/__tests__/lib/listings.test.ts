import axios from 'axios';
import { getAllListings } from '@/lib/api/listings';
import type { Product, SearchFilters } from '@sbay/shared';

// Mock axios
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = require('@/lib/api').api;

describe('Listings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllListings', () => {
    const mockProducts: Product[] = [
      {
        id: 'prod-1',
        title: 'Test Product 1',
        description: 'A test product',
        priceAmount: 10000,
        priceCurrency: 'SYP',
        imageUrls: ['image1.jpg'],
        condition: 'New',
        stock: 5,
        createdAt: '2024-01-01',
      },
      {
        id: 'prod-2',
        title: 'Test Product 2',
        description: 'Another test product',
        priceAmount: 15000,
        priceCurrency: 'SYP',
        imageUrls: ['image2.jpg'],
        condition: 'Used',
        stock: 3,
        createdAt: '2024-01-02',
      },
    ];

    it('handles array response from backend', async () => {
      mockApi.get.mockResolvedValue({ data: mockProducts });

      const result = await getAllListings(1, 10);

      expect(mockApi.get).toHaveBeenCalledWith('/listings', {
        params: {
          page: 1,
          pageSize: 10,
          category: undefined,
          minPrice: undefined,
          maxPrice: undefined,
          condition: undefined,
          region: undefined,
        },
      });

      expect(result).toEqual({
        items: mockProducts,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('handles paginated response from backend', async () => {
      const paginatedResponse = {
        items: mockProducts,
        total: 25,
      };
      
      mockApi.get.mockResolvedValue({ data: paginatedResponse });

      const result = await getAllListings(2, 10);

      expect(result).toEqual({
        items: mockProducts,
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3, // Math.ceil(25/10)
      });
    });

    it('sends correct filters to API', async () => {
      const filters: SearchFilters = {
        category: 'electronics',
        minPrice: 5000,
        maxPrice: 50000,
        condition: 'New',
        region: 'Damascus',
      };

      mockApi.get.mockResolvedValue({ data: [] });

      await getAllListings(1, 20, filters);

      expect(mockApi.get).toHaveBeenCalledWith('/listings', {
        params: {
          page: 1,
          pageSize: 20,
          category: 'electronics',
          minPrice: 5000,
          maxPrice: 50000,
          condition: 'New',
          region: 'Damascus',
        },
      });
    });

    it('handles empty response', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const result = await getAllListings();

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1, // Array length = 0, Math.ceil(0/20) = 1 (as fallback)
      });
    });

    it('handles API errors', async () => {
      const error = new Error('API Error');
      mockApi.get.mockRejectedValue(error);

      await expect(getAllListings()).rejects.toThrow('API Error');
    });

    it('uses default parameters', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await getAllListings();

      expect(mockApi.get).toHaveBeenCalledWith('/listings', {
        params: {
          page: 1,
          pageSize: 20,
          category: undefined,
          minPrice: undefined,
          maxPrice: undefined,
          condition: undefined,
          region: undefined,
        },
      });
    });

    it('handles malformed response gracefully', async () => {
      mockApi.get.mockResolvedValue({ data: null });

      const result = await getAllListings();

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0, // Fallback case in implementation
      });
    });
  });
});