import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CalendarDays, Heart, MapPin, Package, Star, Zap } from 'lucide-react';
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
  const locationLabel = [regionLabel, product.specificLocation].filter(Boolean).join(' - ');
  const sellerReviewCount = product.seller?.reviewCount ?? 0;
  const sellerRating = product.seller?.rating ?? 0;
  const showSellerRating = sellerReviewCount >= 3 && sellerRating > 0;
  const sellerMemberSince = product.seller?.createdAt
    ? new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar' : 'en', {
        month: 'short',
        year: 'numeric',
      }).format(new Date(product.seller.createdAt))
    : null;

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
              className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package size={64} className="text-slate-300" data-testid="package-icon" />
            </div>
          )}

          {product.condition && (
            <span className="product-pill absolute start-3 top-3">
              {t(CONDITION_I18N_MAP[product.condition])}
            </span>
          )}

          {product.isBoosted && (
            <span className="product-pill product-pill-boosted absolute end-3 bottom-3">
              <Zap size={12} />
              Boosted
            </span>
          )}

          {!isAvailable && (
            <span className="product-pill product-pill-unavailable absolute bottom-3 start-3">
              {t('productCard.unavailable')}
            </span>
          )}
          </div>
        </Link>

          <button
            onClick={handleFavoriteClick}
            disabled={isTogglingFavorite}
            className="icon-button absolute end-3 top-3 sm:opacity-0 sm:group-hover:opacity-100"
            title={isLiked ? t('productCard.removeFromFavorites') : t('productCard.addToFavorites')}
            aria-label={isLiked ? t('productCard.removeFromFavorites') : t('productCard.addToFavorites')}
          >
            <Heart
              size={18}
              className={`transition-colors ${
                isLiked ? 'text-red-500 fill-red-500' : 'text-slate-600'
              } ${isTogglingFavorite ? 'animate-pulse' : ''}`}
            />
          </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/listing/${product.id}`} className="group/title">
          <h3 className="mb-2 line-clamp-2 min-h-[3rem] text-[15px] font-semibold leading-6 text-slate-950 transition-colors group-hover/title:text-primary-700">
            {product.title}
          </h3>
        </Link>

          <div className="mb-3 flex h-5 items-center gap-1 text-xs text-slate-500">
            {locationLabel && (
              <>
                <MapPin size={12} className="flex-shrink-0" />
                <span className="truncate">{locationLabel}</span>
              </>
            )}
          </div>

          {(showSellerRating || sellerMemberSince) && (
            <div className="mb-3 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {showSellerRating && (
                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  {t('productCard.sellerRating', {
                    rating: sellerRating.toFixed(1),
                    count: sellerReviewCount,
                  })}
                </span>
              )}
              {sellerMemberSince && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={13} className="text-slate-400" />
                  {t('productCard.memberSince', { date: sellerMemberSince })}
                </span>
              )}
            </div>
          )}

          <div className="mt-auto flex items-end justify-between gap-3">
            <span className="text-xl font-bold tracking-tight text-slate-950 sm:text-[22px]">
              {formatPrice(product.priceAmount, i18n.language, product.priceCurrency)}
            </span>
            <Link
              href={`/listing/${product.id}`}
              className="product-view-link"
            >
              {t('productCard.view')}
            </Link>
          </div>
        </div>
    </article>
  );
}
