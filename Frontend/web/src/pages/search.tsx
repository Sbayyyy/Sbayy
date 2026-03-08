import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import LoadingSpinner from '@/components/LoadingSpinner';
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

  // Filter State
  const [showFilters, setShowFilters] = useState(false);

  const defaultFilters: SearchFilters = {
    category: '',
    minPrice: undefined,
    maxPrice: undefined,
    condition: undefined,
    region: '',
    sortBy: 'date',
    sortOrder: 'desc'
  };

  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);

  useEffect(() => {
    void loadProfanityListFromUrl('/profanities.txt');
  }, []);

  useEffect(() => {
    if (q && typeof q === 'string') {
      setSearchQuery(q);
      
      // Load filters from URL
      setFilters({
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
      });
      
      performSearch(q as string);
    }
  }, [q, category, minPrice, maxPrice, condition, region, sortBy]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    const validation = defaultTextInputValidator.validate(query);
    if (!validation.isValid) {
      setSearchError(validation.message ?? 'Input contains disallowed content');
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      setError('');

      // API Call mit Filtern
      const data = await searchProducts(query, filters);

      // Response Format: SearchResponse
      setResults(data.items || []);
      setTotalResults(data.total || 0);

    } catch (err: unknown) {
      console.error('Search error:', err);
      setError(getErrorMessage(err));
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
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
    if (searchQuery) performSearch(searchQuery);
  };

  const applyFilters = () => {
    executeSearch();
  };

  return (
    <>
      <div className="bg-gray-50 min-h-screen">
        {/* Search Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-6">
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
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
                  className="w-full px-6 py-4 pr-14 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute left-14 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-primary-600 hover:text-primary-700"
                >
                  <Search size={24} />
                </button>
              </div>
            </form>
            {searchError && (
              <p className="mt-2 text-sm text-red-500 text-center">{searchError}</p>
            )}

            {/* Filter Toggle Button */}
            {searched && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <SlidersHorizontal size={18} />
                  {t('filters.filterAndSort')}
                </button>
              </div>
            )}

            {/* Filters Panel */}
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

        {/* Results */}
        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <LoadingSpinner message={t('search.searching')} />
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => performSearch(searchQuery)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {t('common.tryAgain')}
              </button>
            </div>
          ) : searched ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {totalResults > 0
                    ? t('search.resultsFor', { count: totalResults, query: searchQuery })
                    : t('search.noResultsFor', { query: searchQuery })
                  }
                </h1>
              </div>

              {results.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {results.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {t('search.noResultsTitle')}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {t('search.noResultsSuggestion')}
                  </p>
                  <button
                    onClick={() => router.push('/browse')}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    {t('search.browseAll')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('search.initialTitle')}
              </h2>
              <p className="text-gray-600">
                {t('search.initialMessage')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}