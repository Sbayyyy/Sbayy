import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import FilterSidebar from '@/components/FilterSidebar';
import { getAllListings } from '@/lib/api/listings';
import { Product, SearchFilters } from '@sbay/shared';
import { Loader2, AlertCircle, Filter, Home, ChevronRight, Package } from 'lucide-react';
import Head from 'next/head';
import { CATEGORIES, getCategoryDescription, getCategoryName } from '@/lib/constants';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function CategoryPage() {
  const router = useRouter();
  const { slug } = router.query;
  const slugValue = Array.isArray(slug) ? slug[0] : slug;
  const { t, i18n } = useTranslation('common');

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
  const currentCategoryName = currentCategory ? getCategoryName(currentCategory, i18n.language) : '';
  const currentCategoryDescription = currentCategory ? getCategoryDescription(currentCategory, i18n.language) : '';

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
        <div className="info-page flex items-center justify-center px-4">
          <div className="info-panel max-w-md text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h1 className="mb-2 text-2xl font-bold text-slate-950">{t('category.notFound')}</h1>
            <p className="mb-6 text-slate-600">{t('category.notFoundMessage')}</p>
            <Link href="/" className="btn btn-primary">
              {t('category.backHome')}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{t('category.title', { name: currentCategoryName })}</title>
        <meta name="description" content={currentCategoryDescription} />
      </Head>

      <div className="app-page pb-12">
      <section className="border-b border-slate-200/60 bg-white/60 backdrop-blur">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          {/* Breadcrumb */}
          <nav className="mb-5 flex items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="flex items-center gap-1 transition-colors hover:text-primary-700">
              <Home className="h-4 w-4" />
              {t('category.breadcrumbHome')}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-semibold text-slate-900">{currentCategoryName}</span>
          </nav>

          {/* Category Header */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl shadow-sm ring-1 ring-slate-200/70">{currentCategory?.icon}</div>
            <div>
              <h1 className="section-heading">{currentCategoryName}</h1>
              {currentCategoryDescription && <p className="section-subhead">{currentCategoryDescription}</p>}
            </div>
          </div>

          {/* Product Count */}
          <p className="mt-5 text-sm font-medium text-slate-500">
            {loading ? t('category.loadingProducts') : t('category.productCount', { count: products.length })}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 pt-8">
        <div className="flex flex-col gap-8 lg:flex-row">
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
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <p className="text-sm text-slate-600">
                {loading ? t('category.loadingProducts') : t('category.productCountShort', { count: products.length })}
              </p>
              <button
                onClick={() => setShowMobileFilters(true)}
                className="sort-pill"
              >
                <Filter className="h-4 w-4" />
                {t('category.filter')}
              </button>
            </div>

            {/* Error State */}
            {error && (
              <div className="surface-card mb-6 border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Products Grid */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  <div className="mt-8 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="btn btn-outline"
                    >
                      {loadingMore ? (
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      ) : (
                        t('category.loadMore')
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <Package className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                <h3 className="mb-2 text-xl font-bold text-slate-950">{t('category.emptyTitle')}</h3>
                <p className="text-slate-600">{t('category.emptyMessage')}</p>
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
      </div>
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
