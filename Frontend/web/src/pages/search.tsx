import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { searchProducts } from '@/lib/api/search';
import { Product, SearchFilters } from '@sbay/shared';
import { Search, Loader2, X, SlidersHorizontal } from 'lucide-react';

export default function SearchPage() {
  const router = useRouter();
  const { q, category, minPrice, maxPrice, condition, region, sortBy } = router.query;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [totalResults, setTotalResults] = useState(0);

  // Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    category: '',
    minPrice: undefined,
    maxPrice: undefined,
    condition: undefined,
    region: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  useEffect(() => {
    if (q && typeof q === 'string') {
      setSearchQuery(q);
      
      // Load filters from URL
      setFilters({
        category: category ? (category as string) : '',
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        condition: condition as any,
        region: region ? (region as string) : '',
        sortBy: (sortBy as any) || 'date',
        sortOrder: 'desc'
      });
      
      performSearch(q as string);
    }
  }, [q, category, minPrice, maxPrice, condition, region, sortBy]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setSearched(true);
      setError('');

      // API Call mit Filtern
      const data = await searchProducts(query, filters);

      // Response Format: SearchResponse
      setResults(data.items || []);
      setTotalResults(data.total || 0);

    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'حدث خطأ أثناء البحث');
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Build query params
      const params = new URLSearchParams({ q: searchQuery });
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.condition) params.append('condition', filters.condition);
      if (filters.region) params.append('region', filters.region);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      
      router.push(`/search?${params.toString()}`);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setSearched(false);
    setError('');
    setFilters({
      category: '',
      minPrice: undefined,
      maxPrice: undefined,
      condition: undefined,
      region: '',
      sortBy: 'date',
      sortOrder: 'desc'
    });
    router.push('/search');
  };

  const applyFilters = () => {
    if (searchQuery.trim()) {
      handleSearch(new Event('submit') as any);
    }
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن منتجات..."
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

            {/* Filter Toggle Button */}
            {searched && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <SlidersHorizontal size={18} />
                  تصفية وترتيب
                </button>
              </div>
            )}

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Category Filter */}
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">جميع الفئات</option>
                    <option value="إلكترونيات">إلكترونيات</option>
                    <option value="أزياء">أزياء</option>
                    <option value="منزل">منزل وحديقة</option>
                    <option value="سيارات">سيارات</option>
                  </select>

                  {/* Price Range */}
                  <input
                    type="number"
                    placeholder="السعر من"
                    value={filters.minPrice || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="السعر إلى"
                    value={filters.maxPrice || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />

                  {/* Condition Filter */}
                  <select
                    value={filters.condition || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, condition: e.target.value as any }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">جميع الحالات</option>
                    <option value="New">جديد</option>
                    <option value="Used">مستعمل</option>
                    <option value="Refurbished">مجدد</option>
                    <option value="LikeNew">مثل الجديد</option>
                  </select>
                </div>

                {/* Region Filter - New Row */}
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="الموقع (مثال: دمشق، حلب...)"
                    value={filters.region}
                    onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={applyFilters}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    تطبيق الفلاتر
                  </button>
                  <button
                    onClick={() => {
                      setFilters({
                        category: '',
                        minPrice: undefined,
                        maxPrice: undefined,
                        condition: undefined,
                        region: '',
                        sortBy: 'date',
                        sortOrder: 'desc'
                      });
                      if (searchQuery) performSearch(searchQuery);
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    إعادة تعيين
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">جارٍ البحث...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => performSearch(searchQuery)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                حاول مرة أخرى
              </button>
            </div>
          ) : searched ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {totalResults > 0
                    ? `${totalResults} نتيجة للبحث عن "${searchQuery}"`
                    : `لا توجد نتائج للبحث عن "${searchQuery}"`
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
                    لم يتم العثور على نتائج
                  </h2>
                  <p className="text-gray-600 mb-6">
                    جرب استخدام كلمات مختلفة أو إزالة الفلاتر
                  </p>
                  <button
                    onClick={() => router.push('/browse')}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    تصفح جميع المنتجات
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ابحث عن منتجك المفضل
              </h2>
              <p className="text-gray-600">
                اكتب في الأعلى للبحث عبر آلاف المنتجات
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}