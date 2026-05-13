import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Heart, MapPin, Package, Zap } from 'lucide-react';
import { Product } from '@sbay/shared';
import { addFavorite, removeFavorite } from '@/lib/api/favorites';
import { useAuthStore } from '@/lib/store';
import { CONDITION_I18N_MAP, getCityI18nKeyFromValue, getCityLabel } from '@/lib/constants';
import { formatPrice } from '@/lib/formatters';
import { useTranslation } from 'next-i18next';

interface ProductCardProps {
  product: Product;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

export default function ProductCard({ product, onFavorite, isFavorite = false }: ProductCardProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation('common');
  const { isAuthenticated } = useAuthStore();
  const [isLiked, setIsLiked] = useState(isFavorite);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  useEffect(() => {
    setIsLiked(isFavorite);
  }, [isFavorite]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }

    if (isTogglingFavorite) return;

    try {
      setIsTogglingFavorite(true);
      
      if (isLiked) {
        await removeFavorite(product.id);
        setIsLiked(false);
      } else {
        await addFavorite(product.id);
        setIsLiked(true);
      }

      onFavorite?.(product.id);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setIsLiked(isLiked);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const imageUrl = product.thumbnailUrl || product.imageUrls?.[0] || null;
  const isAvailable = product.stock === undefined || product.stock > 0;
  const regionI18nKey = getCityI18nKeyFromValue(product.region);
  const regionLabel = product.region
    ? regionI18nKey
      ? t(regionI18nKey, getCityLabel(product.region, i18n.language))
      : getCityLabel(product.region, i18n.language)
    : '';

  return (
    <article className="surface-card surface-card-hover group h-full overflow-hidden">
      <div className="relative">
        <Link href={`/listing/${product.id}`} className="block">
          <div className="relative aspect-square flex-shrink-0 overflow-hidden bg-slate-100">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={product.title}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package size={64} className="text-slate-300" data-testid="package-icon" />
            </div>
          )}

          {product.condition && (
            <span className="status-pill absolute left-3 top-3 border-white/70 bg-white/95 text-slate-700 shadow-sm backdrop-blur">
              {t(CONDITION_I18N_MAP[product.condition])}
            </span>
          )}

          {product.isBoosted && (
            <span className="status-pill absolute right-3 bottom-3 border-amber-200 bg-amber-50 text-amber-700 shadow-sm">
              <Zap size={13} />
              Boosted
            </span>
          )}

          {!isAvailable && (
            <span className="status-pill absolute bottom-3 left-3 border-red-200 bg-red-500 text-white shadow-sm">
              {t('productCard.unavailable')}
            </span>
          )}
          </div>
        </Link>

          <button
            onClick={handleFavoriteClick}
            disabled={isTogglingFavorite}
            className="icon-button absolute right-3 top-3 bg-white/95 backdrop-blur sm:opacity-0 sm:group-hover:opacity-100"
            title={isLiked ? t('productCard.removeFromFavorites') : t('productCard.addToFavorites')}
            aria-label={isLiked ? t('productCard.removeFromFavorites') : t('productCard.addToFavorites')}
          >
            <Heart 
              size={20} 
              className={`transition-colors ${
                isLiked ? 'text-red-500 fill-red-500' : 'text-gray-600'
              } ${isTogglingFavorite ? 'animate-pulse' : ''}`}
            />
          </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/listing/${product.id}`} className="group/title">
          <h3 className="mb-2 line-clamp-2 min-h-[3rem] font-semibold leading-6 text-slate-950 transition-colors group-hover/title:text-primary-700">
            {product.title}
          </h3>
        </Link>

          <div className="mb-3 flex h-5 items-center gap-1 text-sm text-slate-500">
            {regionLabel && (
              <>
                <MapPin size={14} />
                <span className="truncate">{regionLabel}</span>
              </>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between gap-3">
            <span className="text-xl font-bold text-primary-700 sm:text-2xl">
              {formatPrice(product.priceAmount, i18n.language, product.priceCurrency)}
            </span>
            <Link href={`/listing/${product.id}`} className="btn btn-outline px-3 py-2 text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              {t('productCard.view')}
            </Link>
          </div>
        </div>
    </article>
  );
}
