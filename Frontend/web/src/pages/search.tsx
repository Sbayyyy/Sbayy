import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import SearchFiltersPanel from '@/components/SearchFiltersPanel';
import { searchProducts } from '@/lib/api/search';
import { Product, SearchFilters, defaultTextInputValidator, loadProfanityListFromUrl } from '@sbay/shared';
import { getErrorMessage } from '@/lib/api/errors';
import { Search, X, SlidersHorizontal, ChevronDown, MapPin } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CITIES, FILTER_CATEGORIES, getCategoryName, getCityI18nKeyFromValue, getCityLabel } from '@/lib/constants';

function parseOptionalPrice(value: string | string[] | undefined): number | undefined {
  if (typeof value !== 'string') return undefined;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function SearchPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation('common');
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

  const [showFilters, setShowFilters] = useState(false);
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);
  const regionMenuRef = useRef<HTMLDivElement>(null);

  const defaultFilters = useMemo<SearchFilters>(
    () => ({
      category: '',
      minPrice: undefined,
      maxPrice: undefined,
      condition: undefined,
      region: '',
      sortBy: 'date',
      sortOrder: 'desc',
    }),
    []
  );

  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);

  useEffect(() => {
    void loadProfanityListFromUrl('/profanities.txt');
  }, []);

  useEffect(() => {
    if (q && typeof q === 'string') {
      setSearchQuery(q);
      const nextFilters: SearchFilters = {
        category: category ? (category as string) : '',
        minPrice: parseOptionalPrice(minPrice),
        maxPrice: parseOptionalPrice(maxPrice),
        condition: (['New', 'Used', 'Refurbished', 'LikeNew'] as const).includes(
          condition as SearchFilters['condition'] & string
        )
          ? (condition as SearchFilters['condition'])
          : undefined,
        region: region ? (region as string) : '',
        sortBy: (['price', 'date', 'popular'] as const).includes(sortBy as SearchFilters['sortBy'] & string)
          ? (sortBy as SearchFilters['sortBy'])
          : 'date',
        sortOrder: 'desc',
      };
      setFilters(nextFilters);
      void performSearch(q as string, nextFilters);
    }
  }, [q, category, minPrice, maxPrice, condition, region, sortBy]);

  useEffect(() => {
    if (!regionMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!regionMenuRef.current?.contains(e.target as Node)) setRegionMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [regionMenuOpen]);

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

  const selectedRegionI18nKey = getCityI18nKeyFromValue(filters.region || '');
  const selectedRegionLabel = filters.region
    ? selectedRegionI18nKey
      ? t(selectedRegionI18nKey, getCityLabel(filters.region, i18n.language))
      : getCityLabel(filters.region, i18n.language)
    : '';

  return (
    <Layout title={t('search.title', 'Search')}>
      <div className="app-page pb-12">
        <section className="container mx-auto px-4 pt-8 sm:pt-10">
          <form onSubmit={handleSearch} className="mx-auto max-w-3xl">
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
                  placeholder={t('search.placeholder')}
                  className="hero-command-input ps-12 pe-10"
                  aria-label={t('search.placeholder')}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Clear"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="hero-command-divider hidden sm:block" aria-hidden="true" />

              <div
                ref={regionMenuRef}
                className={`relative flex items-center sm:w-56 ${regionMenuOpen ? 'z-50' : 'z-0'}`}
              >
                <button
                  type="button"
                  onClick={() => setRegionMenuOpen(o => !o)}
                  className="hero-command-region flex w-full items-center gap-2 text-start"
                  aria-expanded={regionMenuOpen}
                  aria-haspopup="listbox"
                >
                  <MapPin className="h-4 w-4 flex-shrink-0 text-primary-600" aria-hidden="true" />
                  <span className="flex-1 truncate text-sm font-medium text-slate-800">
                    {selectedRegionLabel || t('home.allRegions', 'All regions')}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${regionMenuOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {regionMenuOpen && (
                  <div className="hero-region-listbox" role="listbox">
                    <div
                      role="option"
                      aria-selected={!filters.region}
                      onClick={() => {
                        handleFilterChange({ region: '' });
                        setRegionMenuOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        !filters.region ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{t('home.allRegions', 'All regions')}</span>
                    </div>
                    {CITIES.map(city => {
                      const active = filters.region === city.value;
                      return (
                        <div
                          key={city.value}
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            handleFilterChange({ region: city.value });
                            setRegionMenuOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                            active ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{t(city.i18nKey, city.i18nDefault)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
              onClick={() => handleFilterChange({ category: '' })}
              className={`hero-chip ${!filters.category ? 'hero-chip-active' : ''}`}
            >
              <span className="truncate">{t('filters.allCategories')}</span>
            </button>
            {FILTER_CATEGORIES.map(cat => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => handleFilterChange({ category: cat.slug })}
                className={`hero-chip ${filters.category === cat.slug ? 'hero-chip-active' : ''}`}
              >
                <span className="hero-chip-icon" aria-hidden="true">{cat.icon}</span>
                <span className="truncate">{getCategoryName(cat, i18n.language)}</span>
              </button>
            ))}
          </div>

          {searched && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="sort-pill"
              >
                <SlidersHorizontal size={15} />
                <span>{t('filters.filterAndSort')}</span>
              </button>
            </div>
          )}

          {showFilters && (
            <div className="mx-auto mt-4 max-w-4xl">
              <SearchFiltersPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                onApply={applyFilters}
                onReset={resetFilters}
              />
            </div>
          )}
        </section>

        <section className="container mx-auto px-4 pt-8">
          {loading ? (
            <div
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              aria-label={t('search.searching')}
            >
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="empty-state">
              <p className="mb-4 font-medium text-red-600">{error}</p>
              <button onClick={() => performSearch(searchQuery)} className="btn btn-primary">
                {t('common.tryAgain')}
              </button>
            </div>
          ) : searched ? (
            <>
              <div className="mb-6">
                <h1 className="section-heading">
                  {totalResults > 0
                    ? t('search.resultsFor', { count: totalResults, query: searchQuery })
                    : t('search.noResultsFor', { query: searchQuery })}
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
                  <h2 className="mb-2 text-2xl font-bold text-slate-950">{t('search.noResultsTitle')}</h2>
                  <p className="mb-6 text-slate-600">{t('search.noResultsSuggestion')}</p>
                  <button onClick={() => router.push('/browse')} className="btn btn-primary">
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
              <h2 className="mb-2 text-2xl font-bold text-slate-950">{t('search.initialTitle')}</h2>
              <p className="text-slate-600">{t('search.initialMessage')}</p>
            </div>
          )}
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
