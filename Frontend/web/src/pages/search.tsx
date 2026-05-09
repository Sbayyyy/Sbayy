import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import SearchFiltersPanel from '@/components/SearchFiltersPanel';
import { searchProducts } from '@/lib/api/search';
import { Product, SearchFilters, defaultTextInputValidator, loadProfanityListFromUrl } from '@sbay/shared';
import { getErrorMessage } from '@/lib/api/errors';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function SearchPage() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { q, category, minPrice, maxPrice, condition, region, sortBy } = router.query;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchCacheRef = useRef<Map<string, { items: Product[]; total: number }>>(new Map());

  // Filter State
  const [showFilters, setShowFilters] = useState(false);

  const defaultFilters = useMemo<SearchFilters>(() => ({
    category: '',
    minPrice: undefined,
    maxPrice: undefined,
    condition: undefined,
    region: '',
    sortBy: 'date',
    sortOrder: 'desc'
  }), []);

  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);

  useEffect(() => {
    void loadProfanityListFromUrl('/profanities.txt');
  }, []);

  useEffect(() => {
    if (q && typeof q === 'string') {
      setSearchQuery(q);
      
      const nextFilters: SearchFilters = {
        category: category ? (category as string) : '',
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        condition: (['New', 'Used', 'Refurbished', 'LikeNew'] as const).includes(condition as SearchFilters['condition'] & string)
          ? (condition as SearchFilters['condition'])
          : undefined,
        region: region ? (region as string) : '',
        sortBy: (['price', 'date', 'popular'] as const).includes(sortBy as SearchFilters['sortBy'] & string)
          ? (sortBy as SearchFilters['sortBy'])
          : 'date',
        sortOrder: 'desc'
      };

      setFilters(nextFilters);
      void performSearch(q as string, nextFilters);
    }
  }, [q, category, minPrice, maxPrice, condition, region, sortBy]);

  const performSearch = async (query: string, nextFilters = filters) => {
    if (!query.trim()) return;
    const validation = defaultTextInputValidator.validate(query);
    if (!validation.isValid) {
      setSearchError(validation.message ?? 'Input contains disallowed content');
      return;
    }

    const cacheKey = JSON.stringify({ query: query.trim(), filters: nextFilters });
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached) {
      setResults(cached.items);
      setTotalResults(cached.total);
      setSearched(true);
      setError('');
      setLoading(false);
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    try {
      setLoading(true);
      setSearched(true);
      setError('');

      const data = await searchProducts(query, nextFilters, controller.signal);

      const items = data.items || [];
      const total = data.total || 0;
      searchCacheRef.current.set(cacheKey, { items, total });
      if (searchCacheRef.current.size > 20) {
        const oldest = searchCacheRef.current.keys().next().value;
        if (oldest) searchCacheRef.current.delete(oldest);
      }
      setResults(items);
      setTotalResults(total);

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'CanceledError') return;
      console.error('Search error:', err);
      setError(getErrorMessage(err));
      setResults([]);
      setTotalResults(0);
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
        setLoading(false);
      }
    }
  };

  const executeSearch = () => {
    if (!searchQuery.trim()) return;
    const validation = defaultTextInputValidator.validate(searchQuery);
    if (!validation.isValid) {
      setSearchError(validation.message ?? 'Input contains disallowed content');
      return;
    }
    // Build query params
    const params = new URLSearchParams({ q: searchQuery });
    if (filters.category) params.append('category', filters.category);
    if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.condition) params.append('condition', filters.condition);
    if (filters.region) params.append('region', filters.region);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);

    router.push(`/search?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setSearched(false);
    setError('');
    setFilters(defaultFilters);
    router.push('/search');
  };

  const handleFilterChange = (update: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...update }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    if (searchQuery) void performSearch(searchQuery, defaultFilters);
  };

  const applyFilters = () => {
    executeSearch();
  };

  return (
    <Layout title={t('search.title', 'Search')}>
      <div className="app-page">
        <div className="sticky top-[65px] z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-5">
            <form onSubmit={handleSearch} className="mx-auto max-w-3xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                  const next = e.target.value;
                  setSearchQuery(next);
                  const validation = defaultTextInputValidator.validate(next);
                  setSearchError(validation.isValid ? '' : validation.message ?? 'Input contains disallowed content');
                }}
                  placeholder={t('search.placeholder')}
                  className="input h-14 rounded-2xl pr-14 text-base shadow-md shadow-slate-950/5 sm:text-lg"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute left-14 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label={t('common.clear', 'Clear')}
                  >
                    <X size={20} />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
                  aria-label={t('nav.search', 'Search')}
                >
                  <Search size={24} />
                </button>
              </div>
            </form>
            {searchError && (
              <p className="mt-2 text-center text-sm font-medium text-red-600">{searchError}</p>
            )}

            {searched && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="btn btn-outline"
                >
                  <SlidersHorizontal size={18} />
                  {t('filters.filterAndSort')}
                </button>
              </div>
            )}

            {showFilters && (
              <SearchFiltersPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                onApply={applyFilters}
                onReset={resetFilters}
              />
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label={t('search.searching')}>
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="empty-state">
              <p className="mb-4 font-medium text-red-600">{error}</p>
              <button
                onClick={() => performSearch(searchQuery)}
                className="btn btn-primary"
              >
                {t('common.tryAgain')}
              </button>
            </div>
          ) : searched ? (
            <>
              <div className="mb-6">
                <h1 className="page-title">
                  {totalResults > 0
                    ? t('search.resultsFor', { count: totalResults, query: searchQuery })
                    : t('search.noResultsFor', { query: searchQuery })
                  }
                </h1>
              </div>

              {results.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {results.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
                    <Search className="h-8 w-8 text-primary-600" />
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-slate-950">
                    {t('search.noResultsTitle')}
                  </h2>
                  <p className="mb-6 text-slate-600">
                    {t('search.noResultsSuggestion')}
                  </p>
                  <button
                    onClick={() => router.push('/browse')}
                    className="btn btn-primary"
                  >
                    {t('search.browseAll')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
                <Search className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-slate-950">
                {t('search.initialTitle')}
              </h2>
              <p className="text-slate-600">
                {t('search.initialMessage')}
              </p>
            </div>
          )}
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
