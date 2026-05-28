import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/ui/empty-state';
import { getFavorites, removeFavorite } from '@/lib/api/favorites';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useAsyncAction } from '@/lib/hooks/useAsyncAction';
import type { Product } from '@sbay/shared';

export default function FavoritesPage() {
  const { t } = useTranslation('common');
  const isAuthed = useRequireAuth();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getFavorites();
      setFavorites(data);
    } catch (err) {
      console.error('Error loading favorites:', err);
      setError(t('favorites.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isAuthed) return;
    void loadFavorites();
  }, [isAuthed, loadFavorites]);

  const remove = useAsyncAction(
    async (productId: string) => {
      await removeFavorite(productId);
      return productId;
    },
    {
      errorMessage: t('favorites.removeError'),
      onSuccess: (productId) => {
        setFavorites((prev) => prev.filter((p) => p.id !== productId));
      },
    }
  );

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
          <header className="mb-8">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Heart size={24} aria-hidden="true" />
              </div>
              <h1 className="page-title">{t('favorites.heading')}</h1>
            </div>
            <p className="page-subtitle">
              {favorites.length > 0
                ? t('favorites.itemCount', { count: favorites.length })
                : t('favorites.emptyCount')}
            </p>
          </header>

          {error && (
            <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
              {error}
            </div>
          )}

          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {favorites.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onFavorite={remove.run}
                  isFavorite
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Heart}
              iconTone="rose"
              title={t('favorites.emptyTitle')}
              description={t('favorites.emptyMessage')}
              actions={
                <Link href="/browse" className="btn btn-primary">
                  <ShoppingBag size={20} aria-hidden="true" />
                  {t('favorites.browseProducts')}
                </Link>
              }
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'ar', ['common'])) } };
}
