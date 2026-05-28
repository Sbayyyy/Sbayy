import { Fragment } from 'react';
import type { Product } from '@sbay/shared';
import { useTranslation } from 'next-i18next';
import ProductCard from '@/components/ProductCard';
import SponsoredAdCard from '@/components/SponsoredAdCard';
import type { SponsoredAd } from '@/lib/api/ads';

interface BrowseResultsProps {
  products: Product[];
  sponsoredAds: SponsoredAd[];
  favorites: string[];
  hasMore: boolean;
  loadingMore: boolean;
  onFavorite: (id: string) => void;
  onLoadMore: () => void;
}

export default function BrowseResults({
  products,
  sponsoredAds,
  favorites,
  hasMore,
  loadingMore,
  onFavorite,
  onLoadMore,
}: BrowseResultsProps) {
  const { t } = useTranslation('common');

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, index) => (
          <Fragment key={product.id}>
            {index === 4 && sponsoredAds[0] && (
              <SponsoredAdCard key={`ad-${sponsoredAds[0].id}`} ad={sponsoredAds[0]} />
            )}
            <ProductCard
              product={product}
              onFavorite={onFavorite}
              isFavorite={favorites.includes(product.id)}
            />
          </Fragment>
        ))}
      </div>
      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-primary-200 hover:text-primary-700 disabled:opacity-50"
          >
            {loadingMore ? t('common.loading') : t('common.loadMore')}
          </button>
        </div>
      )}
    </>
  );
}
