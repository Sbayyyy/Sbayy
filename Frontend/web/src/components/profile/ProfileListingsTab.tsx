import Link from 'next/link';
import { Loader2, AlertCircle } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@sbay/shared';
import type { TranslationFn } from './types';

interface ProfileListingsTabProps {
  listings: Product[];
  listingsLoading: boolean;
  listingsError: string;
  t: TranslationFn;
}

export default function ProfileListingsTab({
  listings,
  listingsLoading,
  listingsError,
  t,
}: ProfileListingsTabProps) {
  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{t('profile.listingsTitle')}</h2>
        <Link
          href="/listing/sell"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {t('profile.createListing')}
        </Link>
      </div>
      {listingsLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {t('profile.loadingListings')}
        </div>
      ) : listingsError ? (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-4 h-4" />
          {listingsError}
        </div>
      ) : listings.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
          {t('profile.listingsEmpty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
