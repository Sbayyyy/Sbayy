import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import { Filter } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import type { SearchFilters } from '@sbay/shared';
import { defaultTextInputValidator } from '@sbay/shared';
import Layout from '@/components/Layout';
import FilterSidebar from '@/components/FilterSidebar';
import ActiveFilterChips from '@/components/browse/ActiveFilterChips';
import BrowseCommandBar from '@/components/browse/BrowseCommandBar';
import BrowseEmptyState from '@/components/browse/BrowseEmptyState';
import BrowseErrorState from '@/components/browse/BrowseErrorState';
import BrowseLoadingState from '@/components/browse/BrowseLoadingState';
import BrowseResults from '@/components/browse/BrowseResults';
import CategoryScroller from '@/components/browse/CategoryScroller';
import { useBrowseFilters } from '@/components/browse/useBrowseFilters';
import { useBrowseListings } from '@/components/browse/useBrowseListings';

const SORT_OPTIONS: Array<{ value: string; key: string }> = [
  { value: 'date-desc', key: 'filters.sortNewest' },
  { value: 'price-asc', key: 'filters.sortPriceAsc' },
  { value: 'price-desc', key: 'filters.sortPriceDesc' },
  { value: 'popular-desc', key: 'filters.sortPopular' },
];

const SEARCH_DEBOUNCE_MS = 350;

export default function BrowsePage() {
  const router = useRouter();
  const { t, i18n } = useTranslation('common');
  const initFromUrlRef = useRef(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const {
    filters,
    setFilters,
    priceError,
    selectedCategories,
    selectedConditions,
    selectedRegions,
    hasActiveFilters,
    handleFilterChange,
    clearFilters,
    removeCategory,
    removeCondition,
    removeRegion,
  } = useBrowseFilters();
  const {
    products,
    sponsoredAds,
    loading,
    error,
    hasMore,
    loadingMore,
    favorites,
    loadMore,
    loadProducts,
    handleFavorite,
  } = useBrowseListings({
    filters,
    debouncedQuery,
    loadErrorMessage: t('browse.loadError'),
  });

  useEffect(() => {
    if (!router.isReady || initFromUrlRef.current) return;
    initFromUrlRef.current = true;

    const qParam = typeof router.query.q === 'string' ? router.query.q : '';
    const catParam = typeof router.query.category === 'string' ? router.query.category : undefined;
    const regionParam = typeof router.query.region === 'string' ? router.query.region : undefined;

    if (qParam) {
      setSearchQuery(qParam);
      setDebouncedQuery(qParam);
    }

    if (catParam || regionParam) {
      setFilters(prev => {
        const next = { ...prev };
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
    }
  }, [router.isReady, router.query, setFilters]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === debouncedQuery) return;
    const timer = setTimeout(() => setDebouncedQuery(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [debouncedQuery, searchQuery]);

  const syncUrlQuery = useCallback((q: string) => {
    if (!router.isReady) return;
    const next: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(router.query)) {
      if (typeof value === 'string' || Array.isArray(value)) {
        next[key] = value;
      }
    }
    if (q) next.q = q;
    else delete next.q;
    router.replace({ pathname: router.pathname, query: next }, undefined, { shallow: true, scroll: false });
  }, [router]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchError('');
    setDebouncedQuery('');
    syncUrlQuery('');
  }, [syncUrlQuery]);

  const resetSearchAndFilters = useCallback(() => {
    clearFilters();
    clearSearch();
  }, [clearFilters, clearSearch]);

  const handleCommandBarSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    const validation = defaultTextInputValidator.validate(trimmed);
    if (!validation.isValid) {
      setSearchError(validation.message ?? '');
      return;
    }

    setSearchError('');
    setDebouncedQuery(trimmed);
    syncUrlQuery(trimmed);
  };

  if (loading && products.length === 0) {
    return (
      <Layout title={t('browse.title')}>
        <BrowseLoadingState />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title={t('browse.title')}>
        <BrowseErrorState error={error} onRetry={() => loadProducts(debouncedQuery)} />
      </Layout>
    );
  }

  return (
    <Layout title={t('browse.title')} description={t('browse.heading')}>
      <div className="app-page pb-12">
        <BrowseCommandBar
          searchQuery={searchQuery}
          searchError={searchError}
          onSearchQueryChange={setSearchQuery}
          onSearchErrorChange={setSearchError}
          onSubmit={handleCommandBarSubmit}
          onClear={clearSearch}
        />

        <CategoryScroller
          selectedCategories={selectedCategories}
          onCategoryChange={categories => handleFilterChange({ categories, category: undefined })}
        />

        <section className="container mx-auto px-4 pt-8">
          <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="section-heading">
                {debouncedQuery
                  ? t('search.resultsFor', { count: products.length, query: debouncedQuery })
                  : t('browse.heading')}
              </h1>
              {!debouncedQuery && (
                <p className="section-subhead">{t('browse.productCount', { count: products.length })}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMobileFilters(true)}
                className="sort-pill lg:hidden"
              >
                <Filter size={15} />
                <span>{t('filters.filter')}</span>
              </button>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={event => {
                  const [sortBy, sortOrder] = event.target.value.split('-') as [
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
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {t(option.key)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <ActiveFilterChips
              filters={filters}
              selectedCategories={selectedCategories}
              selectedConditions={selectedConditions}
              selectedRegions={selectedRegions}
              onRemoveCategory={removeCategory}
              onRemoveCondition={removeCondition}
              onRemoveRegion={removeRegion}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
            />
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
                <BrowseEmptyState
                  debouncedQuery={debouncedQuery}
                  hasActiveFilters={hasActiveFilters}
                  onReset={resetSearchAndFilters}
                  onSell={() => router.push('/listing/sell')}
                />
              ) : (
                <BrowseResults
                  products={products}
                  sponsoredAds={sponsoredAds}
                  favorites={favorites}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  onFavorite={handleFavorite}
                  onLoadMore={loadMore}
                />
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
