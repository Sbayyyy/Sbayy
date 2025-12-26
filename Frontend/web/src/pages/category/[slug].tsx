import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { getAllListings } from '@/lib/api/listings';
import { Product, SearchFilters } from '@sbay/shared';
import { Loader2, AlertCircle, Filter, X, Home, ChevronRight } from 'lucide-react';
import Head from 'next/head';

// Hardcoded Categories (später aus Backend)
const CATEGORIES = [
  { id: 'electronics', slug: 'electronics', name: 'إلكترونيات', nameEn: 'Electronics', icon: '📱', description: 'هواتف، أجهزة كمبيوتر، أجهزة منزلية إلكترونية' },
  { id: 'fashion', slug: 'fashion', name: 'أزياء', nameEn: 'Fashion', icon: '👔', description: 'ملابس، أحذية، إكسسوارات' },
  { id: 'home', slug: 'home', name: 'منزل وحديقة', nameEn: 'Home & Garden', icon: '🏠', description: 'أثاث، ديكور، أدوات منزلية' },
  { id: 'cars', slug: 'cars', name: 'سيارات', nameEn: 'Cars', icon: '🚗', description: 'سيارات، دراجات، قطع غيار' },
  { id: 'real-estate', slug: 'real-estate', name: 'عقارات', nameEn: 'Real Estate', icon: '🏢', description: 'شقق، منازل، مكاتب للبيع أو الإيجار' },
  { id: 'other', slug: 'other', name: 'أخرى', nameEn: 'Other', icon: '📦', description: 'منتجات متنوعة' }
];

export default function CategoryPage() {
  const router = useRouter();
  const { slug } = router.query;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Find current category
  const currentCategory = CATEGORIES.find(cat => cat.slug === slug);

  // Filter State
  const [filters, setFilters] = useState<SearchFilters>({
    category: slug as string,
    minPrice: undefined,
    maxPrice: undefined,
    condition: undefined,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  useEffect(() => {
    if (slug) {
      setFilters(prev => ({ ...prev, category: slug as string }));
      setPage(1);
      loadProducts(true);
    }
  }, [slug]);

  useEffect(() => {
    if (filters.category) {
      loadProducts(true);
    }
  }, [filters]);

  const loadProducts = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      const data = await getAllListings(currentPage, 20, filters);
      
      if (data.items) {
        setProducts(reset ? data.items : [...products, ...data.items]);
        setHasMore(data.total > currentPage * 20);
      } else if (Array.isArray(data)) {
        setProducts(reset ? data : [...products, ...data]);
        setHasMore(false);
      }

      setError('');
    } catch (err) {
      console.error('Error loading products:', err);
      setError('حدث خطأ في تحميل المنتجات');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1);
      loadProducts(false);
    }
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      category: slug as string,
      minPrice: undefined,
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
          <h1 className="text-2xl font-bold mb-2">الفئة غير موجودة</h1>
          <p className="text-gray-600 mb-6">عذراً، هذه الفئة غير متوفرة</p>
          <Link href="/" className="btn-primary">
            العودة للرئيسية
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{currentCategory?.name} - Sbay سباي</title>
        <meta name="description" content={currentCategory?.description} />
      </Head>

      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/" className="hover:text-primary flex items-center gap-1">
              <Home className="w-4 h-4" />
              الرئيسية
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
            {loading ? 'جاري التحميل...' : `${products.length} منتج متوفر`}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="card sticky top-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">تصفية النتائج</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:underline"
                >
                  مسح الكل
                </button>
              </div>

              {/* Sort */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">الترتيب</label>
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    handleFilterChange({ sortBy: sortBy as any, sortOrder: sortOrder as any });
                  }}
                  className="input w-full"
                >
                  <option value="date-desc">الأحدث</option>
                  <option value="date-asc">الأقدم</option>
                  <option value="price-asc">السعر: من الأقل للأعلى</option>
                  <option value="price-desc">السعر: من الأعلى للأقل</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">السعر (ل.س)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="من"
                    value={filters.minPrice || ''}
                    onChange={(e) => handleFilterChange({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="input w-full"
                  />
                  <input
                    type="number"
                    placeholder="إلى"
                    value={filters.maxPrice || ''}
                    onChange={(e) => handleFilterChange({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Condition */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">الحالة</label>
                <div className="space-y-2">
                  {['new', 'used', 'refurbished'].map(cond => (
                    <label key={cond} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.condition === cond}
                        onChange={(e) => handleFilterChange({ condition: e.target.checked ? cond as any : undefined })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">
                        {cond === 'new' ? 'جديد' : cond === 'used' ? 'مستعمل' : 'مجدد'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {loading ? 'جاري التحميل...' : `${products.length} منتج`}
              </p>
              <button
                onClick={() => setShowMobileFilters(true)}
                className="btn-outline flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                تصفية
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
                        'تحميل المزيد'
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-bold mb-2">لا توجد منتجات في هذه الفئة</h3>
                <p className="text-gray-600 mb-6">جرب تعديل الفلاتر أو العودة للتصفح</p>
                <Link href="/browse" className="btn-primary">
                  تصفح جميع المنتجات
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden">
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">تصفية النتائج</h3>
              <button onClick={() => setShowMobileFilters(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              {/* Same filters as desktop */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">الترتيب</label>
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    handleFilterChange({ sortBy: sortBy as any, sortOrder: sortOrder as any });
                  }}
                  className="input w-full"
                >
                  <option value="date-desc">الأحدث</option>
                  <option value="date-asc">الأقدم</option>
                  <option value="price-asc">السعر: من الأقل للأعلى</option>
                  <option value="price-desc">السعر: من الأعلى للأقل</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">السعر (ل.س)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="من"
                    value={filters.minPrice || ''}
                    onChange={(e) => handleFilterChange({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="input w-full"
                  />
                  <input
                    type="number"
                    placeholder="إلى"
                    value={filters.maxPrice || ''}
                    onChange={(e) => handleFilterChange({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">الحالة</label>
                <div className="space-y-2">
                  {['new', 'used', 'refurbished'].map(cond => (
                    <label key={cond} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.condition === cond}
                        onChange={(e) => handleFilterChange({ condition: e.target.checked ? cond as any : undefined })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">
                        {cond === 'new' ? 'جديد' : cond === 'used' ? 'مستعمل' : 'مجدد'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={clearFilters} className="btn-outline flex-1">
                مسح الكل
              </button>
              <button onClick={() => setShowMobileFilters(false)} className="btn-primary flex-1">
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
