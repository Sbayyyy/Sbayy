import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import FilterSidebar from '@/components/FilterSidebar';
import { getAllListings } from '@/lib/api/listings';
import { Product, SearchFilters } from '@sbay/shared';
import { Loader2, AlertCircle, Filter } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

export default function BrowsePage() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [priceError, setPriceError] = useState('');

  // Favorites State (später aus Store)
  const [favorites, setFavorites] = useState<string[]>([]);

  // Filter State
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    category: '',
    minPrice: 0,
    maxPrice: undefined,
    condition: undefined,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Initialize filters from URL query
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
  }, [filters]); // Reload wenn Filter sich ändern

  const normalizeFilters = (f: SearchFilters): SearchFilters => {
    const priceRangeInvalid =
      f.minPrice !== undefined &&
      f.maxPrice !== undefined &&
      f.minPrice > f.maxPrice;
    return {
      ...f,
      minPrice: priceRangeInvalid ? undefined : f.minPrice,
      maxPrice: priceRangeInvalid ? undefined : f.maxPrice === 0 ? undefined : f.maxPrice,
    };
  };

  const loadProducts = async () => {
    try {
      setError('');
      if (isInitialLoad) {
        setLoading(true);
      }
      const data = await getAllListings(1, 20, normalizeFilters(filters));

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

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await getAllListings(nextPage, 20, normalizeFilters(filters));

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
    // TODO: Sync with backend
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

  // Loading State
  if (loading && products.length === 0) {
    return (
      <Layout title={t('browse.title')}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('browse.loadingProducts')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error State
  if (error) {
    return (
      <Layout title={t('browse.title')}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('browse.loadError')}</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadProducts}
              className="btn btn-primary"
            >
              {t('common.tryAgain')}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('browse.title')} description={t('browse.heading')}>
      <div className="bg-gray-50 min-h-screen">
        {/* Page Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {t('browse.heading')}
                </h1>
                <p className="text-gray-600">
                  {t('browse.productCount', { count: products.length })}
                </p>
              </div>

              {/* Sort & Filter */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors lg:hidden"
                >
                  <Filter size={18} />
                  {t('filters.filter')}
                </button>
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-') as [any, any];
                    setFilters(prev => ({ ...prev, sortBy, sortOrder }));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="date-desc">{t('filters.sortNewest')}</option>
                  <option value="price-asc">{t('filters.sortPriceAsc')}</option>
                  <option value="price-desc">{t('filters.sortPriceDesc')}</option>
                  <option value="popular-desc">{t('filters.sortPopular')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Desktop Filter Sidebar */}
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              showCategories
              priceError={priceError}
            />

            {/* Mobile Filter Sidebar */}
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

            {/* Main Content */}
            <div className="flex-1">
              {products.length === 0 ? (
                <div className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 p-12">
                  <div className="text-center max-w-md mx-auto px-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Filter className="w-10 h-10 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {t('common.noProducts')}
                    </h2>
                    <p className="text-gray-600 mb-6">
                      {t('browse.noProductsMatch')}
                    </p>
                    <button
                      onClick={() => router.push('/listing/sell')}
                      className="btn btn-primary"
                    >
                      {t('browse.addFirstProduct')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onFavorite={handleFavorite}
                        isFavorite={favorites.includes(product.id)}
                      />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="flex justify-center mt-8">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="btn btn-primary"
                      >
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
