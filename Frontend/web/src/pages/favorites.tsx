import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { getFavorites, removeFavorite } from '@/lib/api/favorites';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { Product } from '@sbay/shared';
import { Loader2, Heart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function FavoritesPage() {
  const isAuthed = useRequireAuth();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthed) return;
    loadFavorites();
  }, [isAuthed]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getFavorites();
      setFavorites(data);
    } catch (err: any) {
      console.error('Error loading favorites:', err);
      setError('فشل تحميل المفضلات');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (productId: string) => {
    try {
      await removeFavorite(productId);
      // Update local state
      setFavorites(prev => prev.filter(p => p.id !== productId));
    } catch (err: any) {
      console.error('Error removing favorite:', err);
      setError('فشل إزالة المنتج من المفضلة');
    }
  };

  // Loading State
  if (loading) {
    return (
      <Layout title="مفضلاتي - سباي">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">جارٍ تحميل المفضلات...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="مفضلاتي - سباي">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="text-red-500" size={32} />
              <h1 className="text-3xl font-bold">مفضلاتي</h1>
            </div>
            <p className="text-gray-600">
              {favorites.length > 0 
                ? `لديك ${favorites.length} منتج في المفضلة`
                : 'لا توجد منتجات في المفضلة'
              }
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {/* Favorites Grid */}
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {favorites.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onFavorite={handleRemoveFavorite}
                  isFavorite={true}
                />
              ))}
            </div>
          ) : (
            // Empty State
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="text-gray-400" size={48} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  لا توجد مفضلات بعد
                </h3>
                <p className="text-gray-600 mb-8">
                  ابدأ بإضافة منتجات إلى المفضلة عن طريق النقر على أيقونة القلب
                </p>
                <Link
                  href="/browse"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  <ShoppingBag size={20} />
                  تصفح المنتجات
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
