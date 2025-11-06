import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { getAllListings } from '@/lib/api/listings';
import { Product } from '@sbay/shared';
import { Loader2, AlertCircle, Filter } from 'lucide-react';
import { set } from 'zod/v4';

export default function BrowsePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Favorites State (später aus Store)
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getAllListings(1, 20);
      
      if (data && data.items) {
        setProducts(data.items);
        // Wenn weniger als 20 Items zurückkommen, keine weiteren Seiten
        setHasMore(data.items.length >= 20);
      } else if (Array.isArray(data)) {
        // Fallback wenn API direkt Array zurückgibt
        setProducts(data);
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('فشل تحميل المنتجات. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await getAllListings(nextPage, 20);
      
      if (data && data.items) {
        setProducts(prev => [...prev, ...data.items]);
        setPage(nextPage);
        // Wenn weniger als 20 Items zurückkommen, keine weiteren Seiten
        setHasMore(data.items.length >= 20);
      }
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

  // Loading State
  if (loading) {
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

  // Empty State
  if (products.length === 0) {
    return (
      <Layout title="تصفح المنتجات - سباي">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Filter className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              لا توجد منتجات
            </h2>
            <p className="text-gray-600 mb-6">
              لم يتم العثور على أي منتجات. كن أول من يضيف منتجاً!
            </p>
            <button
              onClick={() => router.push('/listing/sell')}
              className="btn btn-primary"
            >
              أضف منتجك الأول
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

              {/* Sort & Filter - TODO: Implement later */}
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Filter size={18} />
                  تصفية
                </button>
                <select className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="newest">الأحدث</option>
                  <option value="price-low">السعر: من الأقل للأعلى</option>
                  <option value="price-high">السعر: من الأعلى للأقل</option>
                  <option value="popular">الأكثر مشاهدة</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onFavorite={handleFavorite}
                isFavorite={favorites.includes(product.id)}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center mt-12">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="btn btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin inline ml-2" />
                    جارٍ التحميل...
                  </>
                ) : (
                  'تحميل المزيد'
                )}
              </button>
            </div>
          )}

          {/* End Message */}
          {!hasMore && products.length > 0 && (
            <p className="text-center text-gray-500 mt-12">
              لقد وصلت إلى نهاية القائمة
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}