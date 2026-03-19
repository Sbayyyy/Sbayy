import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@sbay/shared';

export interface CartItem {
  product: Product;
  quantity: number;
  addedAt: string;
}

interface CartStore {
  // State
  items: CartItem[];
  isOpen: boolean; // Für Sidebar
  itemCount: number;
  total: number;
  error: string | null; // Error messages
  
  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  clearError: () => void;
  
  // Sidebar Controls
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  
  // Helpers
  getItem: (productId: string) => CartItem | undefined;
  hasItem: (productId: string) => boolean;
}
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial State
      items: [],
      isOpen: false,
      itemCount: 0,
      total: 0,
      error: null,

      // Actions
      addItem: (product: Product, quantity = 1) => {
        const state = get();
        
        // Validate stock
        if (product.stock !== undefined && product.stock < quantity) {
          // i18n key: cart.error.stockInsufficient | interpolation: { stock }
          set({ error: `cart.error.stockInsufficient|${product.stock}` });
          return;
        }

        const existingItem = state.items.find(
          (item) => item.product.id === product.id
        );

        let newItems: CartItem[];

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          
          // Check stock for total quantity
          if (product.stock !== undefined && newQuantity > product.stock) {
            // i18n key: cart.error.stockExceeded | interpolation: { stock }
            set({ error: `cart.error.stockExceeded|${product.stock}` });
            return;
          }
          
          // Produkt existiert → Menge erhöhen
          newItems = state.items.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: newQuantity }
              : item
          );
        } else {
          // Neues Produkt hinzufügen
          newItems = [
            ...state.items,
            {
              product,
              quantity,
              addedAt: new Date().toISOString(),
            },
          ];
        }

        // Berechnungen
        const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const total = newItems.reduce(
          (sum, item) => sum + item.product.priceAmount * item.quantity,
          0
        );

        set({ 
          items: newItems, 
          itemCount, 
          total,
          isOpen: true, // Cart automatisch öffnen
          error: null, // Clear any previous errors
        });
      },

      removeItem: (productId: string) => {
        const state = get();
        const newItems = state.items.filter(
          (item) => item.product.id !== productId
        );

        const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const total = newItems.reduce(
          (sum, item) => sum + item.product.priceAmount * item.quantity,
          0
        );

        set({ items: newItems, itemCount, total });
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const state = get();
        const item = state.items.find((item) => item.product.id === productId);

        if (!item) {
          // i18n key: cart.error.itemNotFound
          set({ error: 'cart.error.itemNotFound' });
          return;
        }

        // Stock Validation
        if (item.product.stock !== undefined && quantity > item.product.stock) {
          // i18n key: cart.error.stockInsufficient | interpolation: { stock }
          set({ error: `cart.error.stockInsufficient|${item.product.stock}` });
          return;
        }

        const newItems = state.items.map((item) =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        );

        const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const total = newItems.reduce(
          (sum, item) => sum + item.product.priceAmount * item.quantity,
          0
        );

        set({ items: newItems, itemCount, total, error: null });
      },

      clearCart: () => {
        set({ 
          items: [], 
          itemCount: 0, 
          total: 0,
          isOpen: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      // Sidebar Controls
      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      openCart: () => {
        set({ isOpen: true });
      },

      closeCart: () => {
        set({ isOpen: false });
      },

      // Helpers
      getItem: (productId: string) => {
        return get().items.find((item) => item.product.id === productId);
      },

      hasItem: (productId: string) => {
        return get().items.some((item) => item.product.id === productId);
      },
    }),
    {
      name: 'sbay-cart-storage', // LocalStorage Key
      partialize: (state) => ({
        items: state.items, // Nur items speichern
      }),
      onRehydrateStorage: () => (state) => {
        // Nach Reload: Berechnungen aktualisieren
        if (state) {
          const itemCount = state.items.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          const total = state.items.reduce(
            (sum, item) => sum + item.product.priceAmount * item.quantity,
            0
          );
          state.itemCount = itemCount;
          state.total = total;
        }
      },
    }
  )
);

export const formatPrice = (price: number, currency: string = 'SYP'): string => {
  return new Intl.NumberFormat('ar-SY', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

/**
 * Translates a cartStore error code into a localized message.
 *
 * Error codes are stored as `"i18nKey"` or `"i18nKey|value"` for
 * keys that need an interpolation variable (the stock count).
 *
 * Usage in a component:
 *   const { error } = useCartStore();
 *   const message = error ? translateCartError(error, t) : null;
 */
export function translateCartError(
  error: string,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const [key, value] = error.split('|');
  const opts = value !== undefined ? { stock: Number(value) } : undefined;
  return t(key, opts);
}