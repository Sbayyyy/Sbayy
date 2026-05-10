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
  const maxQuantity = product.stock ?? 99;
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

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
    <div className={`surface-card surface-card-hover flex gap-4 ${compact ? 'p-3' : 'p-4'}`}>
      <Link href={`/listing/${product.id}`} className="flex-shrink-0">
        <div className={`${compact ? 'w-16 h-16' : 'w-24 h-24'} overflow-hidden rounded-xl bg-slate-100`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/listing/${product.id}`}>
          <h3 className={`${compact ? 'text-sm' : 'text-base'} mb-1 line-clamp-2 font-semibold text-slate-950 transition-colors hover:text-primary-700`}>
            {product.title}
          </h3>
        </Link>

        {!compact && product.region && (
          <p className="text-xs text-slate-500 mb-2">{product.region}</p>
        )}

        <p className={`${compact ? 'text-base' : 'text-lg'} font-bold text-primary-700 mb-3`}>
          {formatPrice(product.priceAmount, product.priceCurrency)}
        </p>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-slate-200 bg-slate-50">
            <button
              onClick={handleDecrease}
              disabled={quantity <= 1 || isOutOfStock}
              className="p-2 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 rounded-full"
              aria-label="Decrease quantity"
            >
              <Minus size={compact ? 14 : 16} />
            </button>

            <span className={`${compact ? 'px-3 text-sm' : 'px-4 text-base'} font-semibold min-w-[40px] text-center`}>
              {quantity}
            </span>

            <button
              onClick={handleIncrease}
              disabled={quantity >= maxQuantity || isOutOfStock}
              className="p-2 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 rounded-full"
              aria-label="Increase quantity"
            >
              <Plus size={compact ? 14 : 16} />
            </button>
          </div>

          {!compact && (
            <span className="text-sm text-slate-600">
              {t('cart.itemSubtotal')} <span className="font-semibold">{formatPrice(subtotal)}</span>
            </span>
          )}
        </div>

        {isOutOfStock ? (
          <p className="text-xs text-red-600 mt-2">
            {t('productCard.unavailable')}
          </p>
        ) : product.stock !== undefined && quantity >= product.stock && (
          <p className="text-xs text-orange-600 mt-2">
            {t('cart.stockWarning', { count: product.stock })}
          </p>
        )}
      </div>

      <button
        onClick={onRemove}
        className="icon-button h-9 w-9 flex-shrink-0 self-start hover:border-red-200 hover:text-red-600"
        aria-label={t('cart.removeFromCart')}
      >
        <X size={20} />
      </button>
    </div>
  );
}
