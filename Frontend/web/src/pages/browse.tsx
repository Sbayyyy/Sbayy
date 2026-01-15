import { useState, useEffect, type ChangeEvent } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { getAllListings } from '@/lib/api/listings';
import { Product, SearchFilters } from '@sbay/shared';
import { Loader2, AlertCircle, Filter, X } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function BrowsePage() {
  const router = useRouter();
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

  const loadProducts = async () => {
    try {
      setError('');
      if (isInitialLoad) {
        setLoading(true);
      }
      const normalizedFilters = {
        ...filters,
        minPrice: filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice ? undefined : filters.minPrice,
        maxPrice: filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice ? undefined : (filters.maxPrice === 0 ? undefined : filters.maxPrice)
      };
      const data = await getAllListings(1, 20, normalizedFilters);
      
      setProducts(data.items || []);
      setHasMore(data.items.length >= 20);
      setPage(1);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('فشل تحميل المنتجات. يرجى المحاولة مرة أخرى.');
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
      const normalizedFilters = {
        ...filters,
        minPrice: filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice ? undefined : filters.minPrice,
        maxPrice: filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice ? undefined : (filters.maxPrice === 0 ? undefined : filters.maxPrice)
      };
      const data = await getAllListings(nextPage, 20, normalizedFilters);
      
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

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (allowedKeys.includes(e.key)) return;
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

const handlePriceChange = (key: 'minPrice' | 'maxPrice') =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const cleaned = raw.replace(/[^0-9]/g, '');
      let value = cleaned === '' ? undefined : Number(cleaned);

      if (key === 'minPrice') {
        value = value !== undefined ? value : 0;
      } else if (value === 0) {
        value = undefined;
      }

      setFilters(prev => ({
        ...prev,
        [key]: Number.isFinite(value) ? value : undefined
      }));
    };

  // Loading State
  if (loading && products.length === 0) {
    return (
      <Layout title="تصفح المنتجات - سباي">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">جارٍ تحميل المنتجات...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error State
  if (error) {
    return (
      <Layout title="تصفح المنتجات - سباي">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">حدث خطأ</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadProducts}
              className="btn btn-primary"
            >
              حاول مرة أخرى
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="تصفح المنتجات - سباي" description="تصفح جميع المنتجات المتوفرة على سباي">
      <div className="bg-gray-50 min-h-screen">
        {/* Page Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  تصفح المنتجات
                </h1>
                <p className="text-gray-600">
                  {products.length} منتج متوفر
                </p>
              </div>

              {/* Sort & Filter */}
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors lg:hidden"
                >
                  <Filter size={18} />
                  تصفية
                </button>
                <select 
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-') as [any, any];
                    setFilters(prev => ({ ...prev, sortBy, sortOrder }));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="date-desc">الأحدث</option>
                  <option value="price-asc">السعر: من الأقل للأعلى</option>
                  <option value="price-desc">السعر: من الأعلى للأقل</option>
                  <option value="popular-desc">الأكثر مشاهدة</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">تصفية النتائج</h3>
                
                {/* Categories */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">الفئة</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, category: '' }))}
                      className={`block w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                        !filters.category 
                          ? 'bg-primary-50 text-primary-700 font-medium' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      جميع الفئات
                    </button>
                    {[
                        { value: 'electronics', label: 'إلكترونيات' },
                        { value: 'fashion', label: 'أزياء' },
                        { value: 'home', label: 'منزل وحديقة' },
                        { value: 'cars', label: 'سيارات' },
                        { value: 'real-estate', label: 'عقارات' }
                      ].map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => setFilters(prev => ({ ...prev, category: cat.value }))}
                        className={`block w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                          filters.category === cat.value
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">السعر (ل.س)</h4>
                  <div className="space-y-3">
                    <input
                      type="number"
                      placeholder="من"
                      value={filters.minPrice ?? ''}
                      onKeyDown={handlePriceKeyDown}
                      onChange={handlePriceChange('minPrice')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="number"
                      placeholder="إلى"
                      value={filters.maxPrice || ''}
                      onKeyDown={handlePriceKeyDown}
                      onChange={handlePriceChange('maxPrice')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {priceError && (
                      <p className="text-xs text-red-600">{priceError}</p>
                    )}
                  </div>
                </div>

                {/* Condition */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">الحالة</h4>
                  <div className="space-y-2">
                    {[
                      { value: undefined, label: 'الكل' },
                      { value: 'New', label: 'جديد' },
                      { value: 'Used', label: 'مستعمل' },
                      { value: 'Refurbished', label: 'مجدد' },
                      { value: 'LikeNew', label: 'مثل الجديد' }
                    ].map(item => (
                      <label key={item.label} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="condition"
                          checked={filters.condition === item.value}
                          onChange={() => setFilters(prev => ({ ...prev, condition: item.value as any }))}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={() => setFilters({
                    category: '',
                    minPrice: 0,
                    maxPrice: undefined,
                    condition: undefined,
                    sortBy: 'date',
                    sortOrder: 'desc'
                  })}
                  className="w-full px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  إعادة تعيين الفلاتر
                </button>
              </div>
            </aside>

            {/* Mobile Filters */}
            {showMobileFilters && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden" onClick={() => setShowMobileFilters(false)}>
                <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">تصفية النتائج</h3>
                      <button onClick={() => setShowMobileFilters(false)}>
                        <X size={24} className="text-gray-500" />
                      </button>
                    </div>

                    {/* Same filters as desktop */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">الفئة</h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setFilters(prev => ({ ...prev, category: '' }));
                            setShowMobileFilters(false);
                          }}
                          className={`block w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                            !filters.category 
                              ? 'bg-primary-50 text-primary-700 font-medium' 
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          جميع الفئات
                        </button>
                        {[
                        { value: 'electronics', label: 'إلكترونيات' },
                        { value: 'fashion', label: 'أزياء' },
                        { value: 'home', label: 'منزل وحديقة' },
                        { value: 'cars', label: 'سيارات' },
                        { value: 'real-estate', label: 'عقارات' }
                      ].map(cat => (
                          <button
                            key={cat.value}
                            onClick={() => {
                              setFilters(prev => ({ ...prev, category: cat.value }));
                              setShowMobileFilters(false);
                            }}
                            className={`block w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.category === cat.value
                                ? 'bg-primary-50 text-primary-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">السعر (ل.س)</h4>
                      <div className="space-y-3">
                        <input
                          type="number"
                          placeholder="من"
                          value={filters.minPrice || ''}
                          onKeyDown={handlePriceKeyDown}
                      onChange={handlePriceChange('minPrice')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          placeholder="إلى"
                          value={filters.maxPrice || ''}
                          onKeyDown={handlePriceKeyDown}
                      onChange={handlePriceChange('maxPrice')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        {priceError && (
                          <p className="text-xs text-red-600">{priceError}</p>
                        )}
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">الحالة</h4>
                      <div className="space-y-2">
                        {[
                          { value: undefined, label: 'الكل' },
                          { value: 'New', label: 'جديد' },
                          { value: 'Used', label: 'مستعمل' },
                          { value: 'Refurbished', label: 'مجدد' },
                          { value: 'LikeNew', label: 'مثل الجديد' }
                        ].map(item => (
                          <label key={item.label} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="condition-mobile"
                              checked={filters.condition === item.value}
                              onChange={() => setFilters(prev => ({ ...prev, condition: item.value as any }))}
                              className="w-4 h-4 text-primary-600"
                            />
                            <span className="text-sm text-gray-700">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setFilters({
                          category: '',
                          minPrice: undefined,
                          maxPrice: undefined,
                          condition: undefined,
                          sortBy: 'date',
                          sortOrder: 'desc'
                        });
                        setShowMobileFilters(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      إعادة تعيين الفلاتر
                    </button>
                  </div>
                </div>
              </div>
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
                      لا توجد منتجات
                    </h2>
                    <p className="text-gray-600 mb-6">
                      لا يوجد منتجات مطابقة للفلاتر. جرب تغيير الفلاتر أو إضافة منتجات جديدة!
                    </p>
                    <button
                      onClick={() => router.push('/listing/sell')}
                      className="btn btn-primary"
                    >
                      أضف منتجك الأول
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
                        {loadingMore ? 'جارٍ التحميل...' : 'تحميل المزيد'}
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
