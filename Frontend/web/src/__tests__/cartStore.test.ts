import { renderHook, act } from '@testing-library/react';

// Mock zustand persist
jest.mock('zustand/middleware', () => ({
  persist: (fn: any) => fn,
}));

import { useCartStore, type CartItem } from '@/lib/cartStore';
import type { Product } from '@sbay/shared';

const mockProduct: Product = {
  id: 'prod-1',
  title: 'Test Product',
  description: 'A test product',
  priceAmount: 10000,
  priceCurrency: 'SYP',
  imageUrls: ['https://example.com/image.jpg'],
  condition: 'New',
  stock: 10,
  createdAt: '2024-01-01',
};

const mockProduct2: Product = {
  id: 'prod-2',
  title: 'Second Product',
  description: 'Another test product',
  priceAmount: 5000,
  priceCurrency: 'SYP',
  imageUrls: [],
  condition: 'Used',
  stock: 5,
  createdAt: '2024-01-02',
};

describe('Cart Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useCartStore.setState({
      items: [],
      isOpen: false,
      itemCount: 0,
      total: 0,
      error: null,
    });
  });

  describe('addItem', () => {
    it('should add a new item to cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe('prod-1');
      expect(result.current.items[0].quantity).toBe(1);
      expect(result.current.itemCount).toBe(1);
      expect(result.current.total).toBe(10000);
      expect(result.current.isOpen).toBe(true); // Cart opens on add
    });

    it('should increase quantity for existing item', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
        result.current.addItem(mockProduct, 2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.itemCount).toBe(3);
      expect(result.current.total).toBe(30000);
    });

    it('should handle multiple different products', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 2);
        result.current.addItem(mockProduct2, 1);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.itemCount).toBe(3);
      expect(result.current.total).toBe(25000); // 2*10000 + 1*5000
    });

    it('should set error when stock is insufficient', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 15); // More than stock (10)
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.error).toContain('المخزون');
    });

    it('should set error when adding more than available stock', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 8);
      });

      act(() => {
        result.current.addItem(mockProduct, 5); // Total would be 13, but stock is 10
      });

      expect(result.current.items[0].quantity).toBe(8); // Should not increase
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('removeItem', () => {
    it('should remove an item from cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 2);
        result.current.addItem(mockProduct2, 1);
      });

      act(() => {
        result.current.removeItem('prod-1');
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe('prod-2');
      expect(result.current.itemCount).toBe(1);
      expect(result.current.total).toBe(5000);
    });

    it('should handle removing non-existent item', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      act(() => {
        result.current.removeItem('non-existent');
      });

      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      act(() => {
        result.current.updateQuantity('prod-1', 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.itemCount).toBe(5);
      expect(result.current.total).toBe(50000);
    });

    it('should remove item when quantity is 0', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 2);
      });

      act(() => {
        result.current.updateQuantity('prod-1', 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should set error when updating to more than stock', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 2);
      });

      act(() => {
        result.current.updateQuantity('prod-1', 15);
      });

      expect(result.current.items[0].quantity).toBe(2); // Unchanged
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 2);
        result.current.addItem(mockProduct2, 3);
      });

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe('Cart Sidebar Controls', () => {
    it('should toggle cart open/close', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.toggleCart();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.toggleCart();
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('should open cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.openCart();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should close cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.openCart();
        result.current.closeCart();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    it('getItem should return correct item', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 2);
      });

      const item = result.current.getItem('prod-1');
      expect(item?.product.id).toBe('prod-1');
      expect(item?.quantity).toBe(2);
    });

    it('getItem should return undefined for non-existent item', () => {
      const { result } = renderHook(() => useCartStore());

      const item = result.current.getItem('non-existent');
      expect(item).toBeUndefined();
    });

    it('hasItem should return true for existing item', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct, 1);
      });

      expect(result.current.hasItem('prod-1')).toBe(true);
    });

    it('hasItem should return false for non-existent item', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.hasItem('non-existent')).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      const { result } = renderHook(() => useCartStore());

      // Trigger an error
      act(() => {
        result.current.addItem(mockProduct, 15);
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
