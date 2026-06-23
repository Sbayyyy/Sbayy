import Link from 'next/link';
import { Loader2, AlertCircle, ShoppingBag } from 'lucide-react';
import ProfileEmptyState from './ProfileEmptyState';
import type { OrderResponse } from '@sbay/shared';
import type { TranslationFn } from './types';

interface ProfilePurchasesTabProps {
  purchases: OrderResponse[];
  purchasesLoading: boolean;
  purchasesError: string;
  locale: string;
  t: TranslationFn;
}

export default function ProfilePurchasesTab({
  purchases,
  purchasesLoading,
  purchasesError,
  locale,
  t,
}: ProfilePurchasesTabProps) {
  const dateFormatter = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.purchasesTitle')}</h2>
      {purchasesLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-600">
          <Loader2 className="me-2 h-5 w-5 animate-spin" />
          {t('profile.loadingPurchases')}
        </div>
      ) : purchasesError ? (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-4 h-4" />
          {purchasesError}
        </div>
      ) : purchases.length === 0 ? (
        <ProfileEmptyState
          icon={ShoppingBag}
          title={t('profile.purchasesEmptyTitle')}
          description={t('profile.purchasesEmptyDescription')}
          actionHref="/browse"
          actionLabel={t('profile.browseListings')}
        />
      ) : (
        <div className="space-y-4">
          {purchases.map(order => (
            <div
              key={order.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-gray-200 rounded-lg p-4"
            >
              <div>
                <p className="text-sm text-gray-500">{t('profile.orderId', { id: order.id.slice(0, 8) })}</p>
                <p className="text-sm text-gray-700">
                  {t(`profile.orderStatus.${order.status}`)}
                </p>
                <p className="text-xs text-gray-400">
                  {dateFormatter.format(new Date(order.createdAt))}
                </p>
              </div>
              <div className="text-sm text-gray-700">
                {t('profile.orderItems', { count: order.items.length })}
              </div>
              <div className="text-start sm:text-end">
                <p className="text-sm text-gray-500">{t('profile.total')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {order.total.toLocaleString(locale)} {t('profile.currency')}
                </p>
              </div>
              <Link
                href={`/dashboard/orders/${order.id}`}
                className="text-sm text-primary-600 hover:underline"
              >
                {t('profile.viewOrder')}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
