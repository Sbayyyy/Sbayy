import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import FilterSidebar from '@/components/FilterSidebar';
import { getAllListings } from '@/lib/api/listings';
import { Product, SearchFilters } from '@sbay/shared';
import { Loader2, AlertCircle, Filter, Home, ChevronRight } from 'lucide-react';
import Head from 'next/head';
import { CATEGORIES } from '@/lib/constants';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function CategoryPage() {
  const router = useRouter();
  const { slug } = router.query;
  const slugValue = Array.isArray(slug) ? slug[0] : slug;
  const { t } = useTranslation('common');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [priceError, setPriceError] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Find current category
  const currentCategory = CATEGORIES.find(cat => cat.slug === slugValue);

  // Filter State
  const [filters, setFilters] = useState<SearchFilters>({
    category: slugValue || '',
    minPrice: 0,
    maxPrice: undefined,
    condition: undefined,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Load products with useCallback to prevent infinite loops
  const loadProducts = useCallback(async (reset = false, pageOverride?: number) => {
    try {
      setError('');
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : (pageOverride ?? page);
      const normalizedFilters = {
        ...filters,
        minPrice: filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice ? undefined : filters.minPrice,
        maxPrice: filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice ? undefined : (filters.maxPrice === 0 ? undefined : filters.maxPrice)
      };
      const data = await getAllListings(currentPage, 20, normalizedFilters);

      if (data.items) {
        setProducts(prev => (reset ? data.items : [...prev, ...data.items]));
        setHasMore(data.total > currentPage * 20);
      } else if (Array.isArray(data)) {
        setProducts(prev => (reset ? data : [...prev, ...data]));
        setHasMore(false);
      }

      setError('');
    } catch (err) {
      console.error('Error loading products:', err);
      setError(t('category.loadError'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, page, t]);

  // Effect for slug change
  useEffect(() => {
    if (slugValue && slugValue !== filters.category) {
      setFilters(prev => ({ ...prev, category: slugValue }));
      setProducts([]); // Clear products when category changes
      setPage(1);
    }
  }, [slugValue, filters.category]);

  // Effect for filters change
  useEffect(() => {
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) {
      setPriceError(t('category.priceError'));
      setError('');
    } else if (priceError) {
      setPriceError('');
    }
    if (filters.category) {
      loadProducts(true);
    }
  }, [filters, loadProducts, t]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadProducts(false, nextPage);
    }
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleFilterChange = (update: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...update }));
  };

  const clearFilters = () => {
    setFilters({
      category: slugValue || '',
      minPrice: 0,
      maxPrice: undefined,
      condition: undefined,
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  if (!currentCategory && !loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t('category.notFound')}</h1>
          <p className="text-gray-600 mb-6">{t('category.notFoundMessage')}</p>
          <Link href="/" className="btn-primary">
            {t('category.backHome')}
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title={t('category.title', { name: currentCategory?.name })}
      description={currentCategory?.description}
    >
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/" className="hover:text-primary flex items-center gap-1">
              <Home className="w-4 h-4" />
              {t('category.breadcrumbHome')}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">{currentCategory?.name}</span>
          </nav>

          {/* Category Header */}
          <div className="flex items-center gap-4 mb-2">
            <div className="text-5xl">{currentCategory?.icon}</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{currentCategory?.name}</h1>
              <p className="text-gray-600 mt-1">{currentCategory?.description}</p>
            </div>
          </div>

          {/* Product Count */}
          <p className="text-sm text-gray-500">
            {loading ? t('category.loadingProducts') : t('category.productCount', { count: products.length })}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filter Sidebar */}
          <FilterSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            showCategories={false}
            showSort
            priceError={priceError}
          />

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {loading ? t('category.loadingProducts') : t('category.productCountShort', { count: products.length })}
              </p>
              <button
                onClick={() => setShowMobileFilters(true)}
                className="btn-outline flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {t('category.filter')}
              </button>
            </div>

            {/* Error State */}
            {error && (
              <div className="card border-red-200 bg-red-50 mb-6">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Products Grid */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onFavorite={toggleFavorite}
                      isFavorite={favorites.includes(product.id)}
                    />
                  ))}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="text-center mt-8">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="btn-outline"
                    >
                      {loadingMore ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      ) : (
                        t('category.loadMore')
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-bold mb-2">{t('category.emptyTitle')}</h3>
                <p className="text-gray-600 mb-6">{t('category.emptyMessage')}</p>
                <Link href="/browse" className="btn-primary">
                  {t('category.browseAll')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <FilterSidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          showCategories={false}
          showSort
          priceError={priceError}
          isMobile
          onClose={() => setShowMobileFilters(false)}
        />
      )}
    </Layout>
  );
}

export async function getServerSideProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}
