import { X, Plus, Minus } from 'lucide-react';
import { CartItem as CartItemType } from '@/lib/cartStore';
import { formatPrice } from '@/lib/cartStore';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  compact?: boolean; // Für Sidebar vs. Full Cart Page
}

export default function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  compact = false
}: CartItemProps) {
  const { product, quantity } = item;
  const subtotal = product.priceAmount * quantity;
  const { t } = useTranslation('common');

  const imageUrl = product.imageUrls?.[0] || null;
  const maxQuantity = product.stock || 99;

  const handleDecrease = () => {
    if (quantity > 1) {
      onUpdateQuantity(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < maxQuantity) {
      onUpdateQuantity(quantity + 1);
    }
  };

  return (
    <div className={`flex gap-4 bg-white ${compact ? 'p-3' : 'p-4'} rounded-lg border border-gray-200 hover:border-gray-300 transition-colors`}>
      {/* Product Image */}
      <Link href={`/listing/${product.id}`} className="flex-shrink-0">
        <div className={`${compact ? 'w-16 h-16' : 'w-24 h-24'} bg-gray-100 rounded-lg overflow-hidden`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/listing/${product.id}`}>
          <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900 hover:text-primary-600 line-clamp-2 mb-1`}>
            {product.title}
          </h3>
        </Link>

        {!compact && product.region && (
          <p className="text-xs text-gray-500 mb-2">{product.region}</p>
        )}

        <p className={`${compact ? 'text-base' : 'text-lg'} font-bold text-primary-600 mb-3`}>
          {formatPrice(product.priceAmount, product.priceCurrency)}
        </p>

        {/* Quantity Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={handleDecrease}
              disabled={quantity <= 1}
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Minus size={compact ? 14 : 16} />
            </button>

            <span className={`${compact ? 'px-3 text-sm' : 'px-4 text-base'} font-semibold min-w-[40px] text-center`}>
              {quantity}
            </span>

            <button
              onClick={handleIncrease}
              disabled={quantity >= maxQuantity}
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={compact ? 14 : 16} />
            </button>
          </div>

          {!compact && (
            <span className="text-sm text-gray-600">
              {t('cart.itemSubtotal')} <span className="font-semibold">{formatPrice(subtotal)}</span>
            </span>
          )}
        </div>

        {/* Stock Warning */}
        {product.stock && quantity >= product.stock && (
          <p className="text-xs text-orange-600 mt-2">
            {t('cart.stockWarning', { count: product.stock })}
          </p>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors self-start"
        aria-label={t('cart.removeFromCart')}
      >
        <X size={20} />
      </button>
    </div>
  );
}
