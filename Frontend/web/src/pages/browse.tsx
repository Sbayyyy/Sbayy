import { Fragment, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import SponsoredAdCard from '@/components/SponsoredAdCard';
import FilterSidebar from '@/components/FilterSidebar';
import { getAllListings } from '@/lib/api/listings';
import { getSponsoredAds, type SponsoredAd } from '@/lib/api/ads';
import { Product, SearchFilters } from '@sbay/shared';
import { AlertCircle, Filter, Search } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { Select } from '@/components/ui/select';

export default function BrowsePage() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [products, setProducts] = useState<Product[]>([]);
  const [sponsoredAds, setSponsoredAds] = useState<SponsoredAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [priceError, setPriceError] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    category: '',
    minPrice: 0,
    maxPrice: undefined,
    condition: undefined,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  useEffect(() => {
    if (router.isReady && router.query.category) {
      setFilters(prev => ({
        ...prev,
        category: router.query.category as string
      }));
    }
  }, [router.isReady, router.query.category]);

  useEffect(() => {
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) {
      setPriceError('Minimum price must be less than or equal to maximum price.');
      setError('');
    } else if (priceError) {
      setPriceError('');
    }
    loadProducts();
  }, [filters]);

  const normalizedFilters = () => ({
    ...filters,
    minPrice: filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice ? undefined : filters.minPrice,
    maxPrice: filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice ? undefined : (filters.maxPrice === 0 ? undefined : filters.maxPrice)
  });

  const loadProducts = async () => {
    try {
      setError('');
      if (isInitialLoad) setLoading(true);
      const data = await getAllListings(1, 20, normalizedFilters());
      setProducts(data.items || []);
      setHasMore(data.items.length >= 20);
      setPage(1);
    } catch (err: unknown) {
      console.error('Error loading products:', err);
      setError(t('browse.loadError'));
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    getSponsoredAds()
      .then(setSponsoredAds)
      .catch(() => setSponsoredAds([]));
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await getAllListings(nextPage, 20, normalizedFilters());
      setProducts(prev => [...prev, ...(data.items || [])]);
      setPage(nextPage);
      setHasMore(data.items.length >= 20);
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFavorite = (id: string) => {
    setFavorites(prev =>
      prev.includes(id)
        ? prev.filter(fav => fav !== id)
        : [...prev, id]
    );
  };

  const handleFilterChange = (update: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...update }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      minPrice: 0,
      maxPrice: undefined,
      condition: undefined,
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  if (loading && products.length === 0) {
    return (
      <Layout title={t('browse.title')}>
        <div className="app-page">
          <div className="border-b border-slate-200/80 bg-white/80">
            <div className="container mx-auto px-4 py-8">
              <div className="skeleton mb-3 h-4 w-28" />
              <div className="skeleton mb-3 h-9 w-64" />
              <div className="skeleton h-5 w-80 max-w-full" />
            </div>
          </div>
          <div className="container mx-auto px-4 py-8">
            <div className="flex gap-8">
              <div className="hidden w-64 flex-shrink-0 lg:block">
                <div className="surface-card p-6">
                  <div className="skeleton mb-6 h-5 w-32" />
                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div key={index} className="skeleton h-9" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title={t('browse.title')}>
        <div className="app-page flex items-center justify-center px-4 py-16">
          <div className="surface-card max-w-md p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-950">{t('browse.loadError')}</h2>
            <p className="mb-6 text-slate-600">{error}</p>
            <button onClick={loadProducts} className="btn btn-primary">
              {t('common.tryAgain')}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('browse.title')} description={t('browse.heading')}>
      <div className="app-page">
        <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="page-kicker">{t('nav.browse')}</p>
                <h1 className="page-title">{t('browse.heading')}</h1>
                <p className="page-subtitle">
                  {t('browse.productCount', { count: products.length })}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="btn btn-outline lg:hidden"
                >
                  <Filter size={18} />
                  {t('filters.filter')}
                </button>
                <Select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-') as [SearchFilters['sortBy'], SearchFilters['sortOrder']];
                    setFilters(prev => ({ ...prev, sortBy, sortOrder }));
                  }}
                  className="min-w-[190px]"
                  aria-label={t('filters.sorting')}
                >
                  <option value="date-desc">{t('filters.sortNewest')}</option>
                  <option value="price-asc">{t('filters.sortPriceAsc')}</option>
                  <option value="price-desc">{t('filters.sortPriceDesc')}</option>
                  <option value="popular-desc">{t('filters.sortPopular')}</option>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              showCategories
              priceError={priceError}
            />

            {showMobileFilters && (
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                showCategories
                priceError={priceError}
                isMobile
                onClose={() => setShowMobileFilters(false)}
              />
            )}

            <div className="flex-1">
              {products.length === 0 ? (
                <div className="surface-card flex items-center justify-center p-10 sm:p-14">
                  <div className="mx-auto max-w-md text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
                      <Search className="h-8 w-8 text-primary-600" />
                    </div>
                    <h2 className="mb-2 text-xl font-bold text-slate-950">{t('common.noProducts')}</h2>
                    <p className="mb-6 text-slate-600">{t('browse.noProductsMatch')}</p>
                    <button onClick={() => router.push('/listing/sell')} className="btn btn-primary">
                      {t('browse.addFirstProduct')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product, index) => (
                      <Fragment key={product.id}>
                        {index === 4 && sponsoredAds[0] && (
                          <SponsoredAdCard key={`ad-${sponsoredAds[0].id}`} ad={sponsoredAds[0]} />
                        )}
                        <ProductCard
                          product={product}
                          onFavorite={handleFavorite}
                          isFavorite={favorites.includes(product.id)}
                        />
                      </Fragment>
                    ))}
                  </div>
                  {hasMore && (
                    <div className="flex justify-center mt-8">
                      <button onClick={loadMore} disabled={loadingMore} className="btn btn-primary">
                        {loadingMore ? t('common.loading') : t('common.loadMore')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}
