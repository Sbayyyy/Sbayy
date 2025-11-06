// components/CartSidebar.tsx
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore, formatPrice } from '@/lib/cartStore';
import CartItem from '@/components/CartItem';
import Link from 'next/link';
import { useEffect } from 'react';

export default function CartSidebar() {
  const { 
    items, 
    isOpen, 
    closeCart, 
    total, 
    itemCount,
    updateQuantity, 
    removeItem 
  } = useCartStore();

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCart();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeCart]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag size={24} className="text-primary-600" />
            <h2 className="text-xl font-bold">سلة التسوق</h2>
            {itemCount > 0 && (
              <span className="bg-primary-100 text-primary-600 text-sm font-semibold px-2 py-1 rounded-full">
                {itemCount}
              </span>
            )}
          </div>
          
          <button
            onClick={closeCart}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="إغلاق السلة"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag size={48} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              السلة فارغة
            </h3>
            <p className="text-gray-600 mb-6">
              لم تقم بإضافة أي منتجات بعد
            </p>
            <button
              onClick={closeCart}
              className="btn btn-primary"
            >
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <>
            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((item) => (
                <CartItem
                  key={item.product.id}
                  item={item}
                  onUpdateQuantity={(qty) => updateQuantity(item.product.id, qty)}
                  onRemove={() => removeItem(item.product.id)}
                  compact={true}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 p-4 space-y-4">
              {/* Total */}
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold">المجموع الكلي:</span>
                <span className="text-2xl font-bold text-primary-600">
                  {formatPrice(total)}
                </span>
              </div>

              {/* Buttons */}
              <div className="space-y-2">
                <Link
                  href="/checkout"
                  className="block w-full btn btn-primary text-center"
                  onClick={closeCart}
                >
                  <span>إتمام الشراء</span>
                  <ArrowRight size={20} className="inline mr-2" />
                </Link>
                
                <Link
                  href="/cart"
                  className="block w-full text-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={closeCart}
                >
                  عرض السلة
                </Link>
              </div>

              {/* Continue Shopping */}
              <button
                onClick={closeCart}
                className="w-full text-center text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                ← متابعة التسوق
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}