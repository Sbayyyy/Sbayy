import Link from 'next/link';
import { Package } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import type { ReactNode } from 'react';
import type { Product } from '@sbay/shared';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';

interface HomeListingSectionsProps {
  recommendedProducts: Product[];
  browseProducts: Product[];
  featuredProducts: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  categorySlot?: ReactNode;
}

const skeletonKeys = [1, 2, 3, 4, 5, 6, 7, 8];

export default function HomeListingSections({
  recommendedProducts,
  browseProducts,
  featuredProducts,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  categorySlot,
}: HomeListingSectionsProps) {
  const { t } = useTranslation('common');

  return (
    <>
      {recommendedProducts.length > 0 && (
        <div className="container mx-auto px-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-950">{t('home.recommendedForYou', 'Recommended for you')}</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {recommendedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {categorySlot}

      <div className="container mx-auto px-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-950">{t('home.browseListings', 'Browse listings')}</h2>
          <Link href="/browse" className="rounded-full px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50">
            {t('common.viewAll')}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {skeletonKeys.map(i => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : browseProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {browseProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  {loadingMore ? t('common.loading', 'Loading...') : t('common.loadMore', 'Load more')}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <Package size={56} className="mx-auto mb-4 text-slate-300" />
            <h3 className="mb-2 text-xl font-semibold text-slate-950">{t('common.noProducts')}</h3>
            <p className="text-slate-600">{t('home.noProductsAvailable')}</p>
          </div>
        )}
      </div>

      {(loading || featuredProducts.length > 0) && (
        <div className="container mx-auto px-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-950">{t('home.featuredListings')}</h2>
            <Link href="/browse" className="rounded-full px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50">
              {t('common.viewAll')}
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
