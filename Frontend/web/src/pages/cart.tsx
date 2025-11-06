// pages/cart/cart.tsx (oder besser: pages/cart.tsx)
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import CartItem from '@/components/CartItem';
import { useCartStore, formatPrice } from '@/lib/cartStore';
import { ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
  const router = useRouter();
  const { items, total, itemCount, updateQuantity, removeItem, clearCart } = useCartStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearCart = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  // Empty State
  if (items.length === 0) {
    return (
      <Layout title="سلة التسوق - سباي">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={64} className="text-gray-300" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              سلة التسوق فارغة
            </h1>
            <p className="text-gray-600 mb-8">
              لم تقم بإضافة أي منتجات بعد. ابدأ بتصفح المنتجات المتوفرة!
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/browse')}
                className="btn btn-primary w-full"
              >
                تصفح المنتجات
              </button>
              <button
                onClick={() => router.push('/')}
                className="btn border border-gray-300 hover:bg-gray-100 w-full"
              >
                العودة للرئيسية
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`سلة التسوق (${itemCount}) - سباي`}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              سلة التسوق
            </h1>
            <p className="text-gray-600">
              لديك {itemCount} {itemCount === 1 ? 'منتج' : 'منتجات'} في السلة
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items - Left Side (2/3) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Clear Cart Button */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">المنتجات</h2>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm"
                >
                  <Trash2 size={16} />
                  تفريغ السلة
                </button>
              </div>

              {/* Items List */}
              {items.map((item) => (
                <CartItem
                  key={item.product.id}
                  item={item}
                  onUpdateQuantity={(qty) => updateQuantity(item.product.id, qty)}
                  onRemove={() => removeItem(item.product.id)}
                  compact={false}
                />
              ))}
            </div>

            {/* Order Summary - Right Side (1/3) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-6">ملخص الطلب</h2>

                {/* Summary Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>المجموع الفرعي ({itemCount} منتجات)</span>
                    <span className="font-semibold">{formatPrice(total)}</span>
                  </div>
                  
                  <div className="flex justify-between text-gray-600">
                    <span>الشحن</span>
                    <span className="text-sm">يُحسب عند الدفع</span>
                  </div>

                  <hr className="my-4" />

                  <div className="flex justify-between text-lg font-bold">
                    <span>المجموع الكلي</span>
                    <span className="text-2xl text-primary-600">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <Link
                  href="/checkout"
                  className="block w-full btn btn-primary text-center mb-3"
                >
                  <span>متابعة إلى الدفع</span>
                  <ArrowRight size={20} className="inline mr-2" />
                </Link>

                {/* Continue Shopping */}
                <Link
                  href="/browse"
                  className="block w-full text-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  متابعة التسوق
                </Link>

                {/* Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💳 الدفع الآمن عند الاستلام
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    🚚 توصيل سريع لجميع المحافظات
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowClearConfirm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 z-50 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-3">تفريغ السلة؟</h3>
            <p className="text-gray-600 mb-6">
              هل أنت متأكد من حذف جميع المنتجات من السلة؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClearCart}
                className="flex-1 btn bg-red-600 hover:bg-red-700 text-white"
              >
                نعم، تفريغ السلة
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 btn border border-gray-300 hover:bg-gray-100"
              >
                إلغاء
              </button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}