import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { getFavorites, removeFavorite } from '@/lib/api/favorites';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { Product } from '@sbay/shared';
import { Heart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function FavoritesPage() {
  const { t } = useTranslation('common');
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
    } catch (err: unknown) {
      console.error('Error loading favorites:', err);
      setError(t('favorites.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (productId: string) => {
    try {
      await removeFavorite(productId);
      setFavorites(prev => prev.filter(p => p.id !== productId));
    } catch (err: unknown) {
      console.error('Error removing favorite:', err);
      setError(t('favorites.removeError'));
    }
  };

  // Loading State
  if (loading) {
    return (
      <Layout title={t('favorites.title')}>
        <LoadingSpinner fullPage message={t('favorites.loading')} />
      </Layout>
    );
  }

  return (
    <Layout title={t('favorites.title')}>
      <div className="app-page py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Heart size={24} />
              </div>
              <h1 className="page-title">{t('favorites.heading')}</h1>
            </div>
            <p className="page-subtitle">
              {favorites.length > 0
                ? t('favorites.itemCount', { count: favorites.length })
                : t('favorites.emptyCount')
              }
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
              {error}
            </div>
          )}

          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="empty-state">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                  <Heart className="text-red-400" size={40} />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-slate-950">
                  {t('favorites.emptyTitle')}
                </h3>
                <p className="mb-8 text-slate-600">
                  {t('favorites.emptyMessage')}
                </p>
                <Link
                  href="/browse"
                  className="btn btn-primary"
                >
                  <ShoppingBag size={20} />
                  {t('favorites.browseProducts')}
                </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'ar', ['common'])) } };
}
