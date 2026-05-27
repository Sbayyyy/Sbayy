import { Fragment, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import SponsoredAdCard from '@/components/SponsoredAdCard';
import FilterSidebar from '@/components/FilterSidebar';
import { getAllListings } from '@/lib/api/listings';
import { getSponsoredAds, type SponsoredAd } from '@/lib/api/ads';
import { ListingCondition, Product, SearchFilters, defaultTextInputValidator } from '@sbay/shared';
import { AlertCircle, Filter, Search, X } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { FILTER_CATEGORIES, FILTER_CONDITIONS, getCategoryName, getCityI18nKeyFromValue, getCityLabel } from '@/lib/constants';

const SORT_OPTIONS: Array<{ value: string; key: string }> = [
  { value: 'date-desc', key: 'filters.sortNewest' },
  { value: 'price-asc', key: 'filters.sortPriceAsc' },
  { value: 'price-desc', key: 'filters.sortPriceDesc' },
  { value: 'popular-desc', key: 'filters.sortPopular' },
];

export default function BrowsePage() {
  const router = useRouter();
  const { t, i18n } = useTranslation('common');
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    categories: [],
    minPrice: 0,
    maxPrice: undefined,
    conditions: [],
    regions: [],
    sortBy: 'date',
    sortOrder: 'desc',
  });

  useEffect(() => {
    if (!router.isReady) return;
    const catParam = typeof router.query.category === 'string' ? router.query.category : undefined;
    const regionParam = typeof router.query.region === 'string' ? router.query.region : undefined;
    if (!catParam && !regionParam) return;

    setFilters(prev => {
      const next: typeof prev = { ...prev };
      if (catParam) {
        const cats = prev.categories ?? [];
        next.categories = cats.includes(catParam) ? cats : [...cats, catParam];
      }
      if (regionParam) {
        const regs = prev.regions ?? [];
        next.regions = regs.includes(regionParam) ? regs : [...regs, regionParam];
      }
      return next;
    });
  }, [router.isReady, router.query.category, router.query.region]);

  useEffect(() => {
    if (
      filters.minPrice !== undefined &&
      filters.maxPrice !== undefined &&
      filters.minPrice > filters.maxPrice
    ) {
      setPriceError(t('filters.priceError'));
      setError('');
    } else if (priceError) {
      setPriceError('');
    }
    loadProducts();
  }, [filters]);

  const normalizedFilters = () => ({
    ...filters,
    minPrice:
      filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice
        ? undefined
        : filters.minPrice,
    maxPrice:
      filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice
        ? undefined
        : filters.maxPrice === 0
          ? undefined
          : filters.maxPrice,
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
      prev.includes(id) ? prev.filter(fav => fav !== id) : [...prev, id]
    );
  };

  const handleFilterChange = (update: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...update }));
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      minPrice: 0,
      maxPrice: undefined,
      conditions: [],
      regions: [],
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const handleCommandBarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const validation = defaultTextInputValidator.validate(trimmed);
    if (!validation.isValid) {
      setSearchError(validation.message ?? t('search.placeholder'));
      return;
    }
    const params = new URLSearchParams({ q: trimmed });
    const firstCategory = filters.categories?.[0];
    if (firstCategory) params.set('category', firstCategory);
    router.push(`/search?${params.toString()}`);
  };

  const conditionLabel = (value?: string) => {
    if (!value) return '';
    const c = FILTER_CONDITIONS.find(item => item.value === value);
    return c ? t(c.i18nKey) : value;
  };

  const categoryLabel = (slug?: string) => {
    if (!slug) return '';
    const c = FILTER_CATEGORIES.find(item => item.slug === slug);
    return c ? getCategoryName(c, i18n.language) : slug;
  };

  const regionLabel = (value?: string) => {
    if (!value) return '';
    const key = getCityI18nKeyFromValue(value);
    return key ? t(key, getCityLabel(value, i18n.language)) : getCityLabel(value, i18n.language);
  };

  const selectedCategories = filters.categories ?? [];
  const selectedConditions = filters.conditions ?? [];
  const selectedRegions = filters.regions ?? [];

  const removeCategory = (slug: string) =>
    setFilters(prev => ({ ...prev, categories: (prev.categories ?? []).filter(c => c !== slug) }));
  const removeCondition = (value: ListingCondition) =>
    setFilters(prev => ({ ...prev, conditions: (prev.conditions ?? []).filter(c => c !== value) }));
  const removeRegion = (value: string) =>
    setFilters(prev => ({ ...prev, regions: (prev.regions ?? []).filter(r => r !== value) }));

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedConditions.length > 0 ||
    selectedRegions.length > 0 ||
    Boolean((filters.minPrice && filters.minPrice > 0) || filters.maxPrice);

  if (loading && products.length === 0) {
    return (
      <Layout title={t('browse.title')}>
        <div className="app-page pb-12">
          <div className="container mx-auto px-4 pt-8 sm:pt-10">
            <div className="skeleton mx-auto h-14 w-full max-w-3xl rounded-[28px]" />
            <div className="mt-5 flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-8 w-20 rounded-full" />
              ))}
            </div>
          </div>
          <div className="container mx-auto px-4 py-8">
            <div className="flex gap-8">
              <div className="hidden w-64 flex-shrink-0 lg:block">
                <div className="surface-card p-5">
                  <div className="skeleton mb-5 h-4 w-24" />
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, index) => (
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
      <div className="app-page pb-12">
        <section className="container mx-auto px-4 pt-8 sm:pt-10">
          <form onSubmit={handleCommandBarSubmit} className="mx-auto max-w-3xl">
            <div className="hero-command-bar flex flex-col sm:flex-row sm:items-stretch">
              <div className="relative flex flex-1 items-center">
                <Search
                  className="pointer-events-none absolute start-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => {
                    const next = e.target.value;
                    setSearchQuery(next);
                    const validation = defaultTextInputValidator.validate(next);
                    setSearchError(validation.isValid ? '' : validation.message ?? '');
                  }}
                  placeholder={t('home.heroSearchPlaceholder')}
                  className="hero-command-input ps-12"
                  aria-label={t('search.placeholder')}
                />
              </div>
              <button type="submit" className="hero-command-submit justify-center sm:justify-start">
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>{t('home.heroSearchCta')}</span>
              </button>
            </div>
          </form>
          {searchError && (
            <p className="mx-auto mt-2 max-w-3xl text-center text-sm font-medium text-red-600">
              {searchError}
            </p>
          )}

          <div className="mt-5 flex w-full items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0">
            <button
              type="button"
              onClick={() => handleFilterChange({ categories: [], category: undefined })}
              className={`hero-chip ${selectedCategories.length === 0 ? 'hero-chip-active' : ''}`}
            >
              <span className="truncate">{t('filters.allCategories')}</span>
            </button>
            {FILTER_CATEGORIES.map(cat => {
              const active = selectedCategories.includes(cat.slug);
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? selectedCategories.filter(c => c !== cat.slug)
                      : [...selectedCategories, cat.slug];
                    handleFilterChange({ categories: next, category: undefined });
                  }}
                  className={`hero-chip ${active ? 'hero-chip-active' : ''}`}
                >
                  <span className="hero-chip-icon" aria-hidden="true">{cat.icon}</span>
                  <span className="truncate">{getCategoryName(cat, i18n.language)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="container mx-auto px-4 pt-8">
          <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="section-heading">{t('browse.heading')}</h1>
              <p className="section-subhead">{t('browse.productCount', { count: products.length })}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileFilters(true)}
                className="sort-pill lg:hidden"
              >
                <Filter size={15} />
                <span>{t('filters.filter')}</span>
              </button>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={e => {
                  const [sortBy, sortOrder] = e.target.value.split('-') as [
                    SearchFilters['sortBy'],
                    SearchFilters['sortOrder']
                  ];
                  setFilters(prev => ({ ...prev, sortBy, sortOrder }));
                }}
                className="sort-pill appearance-none pe-8"
                aria-label={t('filters.sorting')}
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 7.5L10 12.5L15 7.5' stroke='%2364758B' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: i18n.language?.startsWith('ar') ? 'left 0.75rem center' : 'right 0.75rem center',
                }}
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.key)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t('filters.activeFilters')}
              </span>
              {selectedCategories.map(slug => (
                <button
                  key={`cat-${slug}`}
                  type="button"
                  onClick={() => removeCategory(slug)}
                  className="filter-active-pill"
                >
                  <span>{categoryLabel(slug)}</span>
                  <span className="filter-active-pill-x" aria-hidden="true">
                    <X size={12} />
                  </span>
                </button>
              ))}
              {selectedConditions.map(value => (
                <button
                  key={`cond-${value}`}
                  type="button"
                  onClick={() => removeCondition(value)}
                  className="filter-active-pill"
                >
                  <span>{conditionLabel(value)}</span>
                  <span className="filter-active-pill-x" aria-hidden="true">
                    <X size={12} />
                  </span>
                </button>
              ))}
              {selectedRegions.map(value => (
                <button
                  key={`reg-${value}`}
                  type="button"
                  onClick={() => removeRegion(value)}
                  className="filter-active-pill"
                >
                  <span>{regionLabel(value)}</span>
                  <span className="filter-active-pill-x" aria-hidden="true">
                    <X size={12} />
                  </span>
                </button>
              ))}
              {filters.minPrice && filters.minPrice > 0 ? (
                <button
                  type="button"
                  onClick={() => handleFilterChange({ minPrice: 0 })}
                  className="filter-active-pill"
                >
                  <span>{t('filters.priceFrom')}: {filters.minPrice}</span>
                  <span className="filter-active-pill-x" aria-hidden="true">
                    <X size={12} />
                  </span>
                </button>
              ) : null}
              {filters.maxPrice ? (
                <button
                  type="button"
                  onClick={() => handleFilterChange({ maxPrice: undefined })}
                  className="filter-active-pill"
                >
                  <span>{t('filters.priceTo')}: {filters.maxPrice}</span>
                  <span className="filter-active-pill-x" aria-hidden="true">
                    <X size={12} />
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={clearFilters}
                className="ms-1 text-xs font-semibold text-slate-500 underline-offset-2 transition-colors hover:text-primary-700 hover:underline"
              >
                {t('filters.clearAll')}
              </button>
            </div>
          )}

          <div className="flex gap-8">
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              showCategories
              showRegion
              priceError={priceError}
            />

            {showMobileFilters && (
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                showCategories={false}
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
                    <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="btn btn-outline">
                          {t('filters.resetFilters')}
                        </button>
                      )}
                      <button onClick={() => router.push('/listing/sell')} className="btn btn-primary">
                        {t('browse.addFirstProduct')}
                      </button>
                    </div>
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
                    <div className="mt-10 flex justify-center">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-primary-200 hover:text-primary-700 disabled:opacity-50"
                      >
                        {loadingMore ? t('common.loading') : t('common.loadMore')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common'])),
    },
  };
}
