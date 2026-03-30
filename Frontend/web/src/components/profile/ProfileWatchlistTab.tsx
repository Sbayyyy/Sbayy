import { Loader2, AlertCircle } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@sbay/shared';
import { useTranslation } from 'next-i18next';

interface ProfileWatchlistTabProps {
  watchlist: Product[];
  watchlistLoading: boolean;
  watchlistError: string;
  onRemoveFavorite: (id: string) => void;
}

export default function ProfileWatchlistTab({
  watchlist,
  watchlistLoading,
  watchlistError,
  onRemoveFavorite,
}: ProfileWatchlistTabProps) {
  const { t } = useTranslation('common');
  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.watchlistTitle')}</h2>
      {watchlistLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {t('profile.loadingWatchlist')}
        </div>
      ) : watchlistError ? (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-4 h-4" />
          {watchlistError}
        </div>
      ) : watchlist.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
          {t('profile.watchlistEmpty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {watchlist.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite={true}
              onFavorite={onRemoveFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
