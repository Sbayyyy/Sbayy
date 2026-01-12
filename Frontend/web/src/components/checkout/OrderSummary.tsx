import { CartItem, formatPrice } from '@/lib/cartStore';
import { Package } from 'lucide-react';

interface OrderSummaryProps {
  items: CartItem[];
  shippingCost?: number;
  onAgreed: (agreed: boolean) => void;
  agreedToTerms?: boolean;
}
/* TODO (Eyas): Add /terms and /privacy pages */

/**
 * OrderSummary Component - Modern Redesign
 * 
 * Clean minimalist review
 * - Items list with images
 * - Price breakdown
 * - Terms checkbox
 * - Arabic RTL support
 * 
 * TODO (Mo): Calculate shipping from backend
 * POST /api/shipping/calculate { city: string } → { cost: number }
 */
export default function OrderSummary({ 
  items, 
  shippingCost = 500,
  onAgreed,
  agreedToTerms = false 
}: OrderSummaryProps) {
  
  const subtotal = items.reduce((sum, item) => sum + item.product.priceAmount * item.quantity, 0);
  const total = subtotal + (shippingCost || 0);

  return (
    <div>
      <h3 className="text-xl font-bold mb-6">مراجعة الطلب</h3>

      {/* Items List - Compact View */}
      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div key={item.product.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
            {item.product.imageUrls?.[0] ? (
              <img
                src={item.product.imageUrls[0]}
                alt={item.product.title}
                className="w-16 h-16 rounded object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                <Package size={24} className="text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">{item.product.title}</h4>
              <p className="text-sm text-gray-600 mt-1">
                الكمية: {item.quantity}
              </p>
              <p className="text-sm font-semibold text-blue-600 mt-1">
                {formatPrice(item.product.priceAmount * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Price Breakdown */}
      <div className="space-y-3 mb-6">
        {/* Subtotal */}
        <div className="flex justify-between text-gray-600">
          <span>المجموع الفرعي</span>
          <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
        </div>

        {/* Shipping */}
        <div className="flex justify-between text-gray-600">
          <span>رسوم الشحن</span>
          <span className="font-semibold text-gray-900">{formatPrice(shippingCost)}</span>
        </div>

        <div className="border-t pt-3">
          <div className="flex justify-between">
            <span className="text-lg font-bold text-gray-900">الإجمالي</span>
            <span className="text-2xl font-bold text-blue-600">
              {formatPrice(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="mb-6">
        <label className="flex items-start gap-3 cursor-pointer p-4 bg-gray-50 rounded-lg border border-gray-200">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => onAgreed(e.target.checked)}
            className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            أوافق على <a href="#" className="text-blue-600 hover:underline">شروط الاستخدام</a> و<a href="#" className="text-blue-600 hover:underline">سياسة الخصوصية</a>
          </span>
        </label>
      </div>
    </div>
  );
}
