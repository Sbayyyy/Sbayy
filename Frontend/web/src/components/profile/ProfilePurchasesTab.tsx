import Link from 'next/link';
import { Loader2, AlertCircle } from 'lucide-react';
import type { OrderResponse } from '@sbay/shared';
import { useTranslation } from 'next-i18next';

interface ProfilePurchasesTabProps {
  purchases: OrderResponse[];
  purchasesLoading: boolean;
  purchasesError: string;
}

export default function ProfilePurchasesTab({
  purchases,
  purchasesLoading,
  purchasesError,
}: ProfilePurchasesTabProps) {
  const { t } = useTranslation('common');
  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.purchasesTitle')}</h2>
      {purchasesLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {t('profile.loadingPurchases')}
        </div>
      ) : purchasesError ? (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-4 h-4" />
          {purchasesError}
        </div>
      ) : purchases.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
          {t('profile.purchasesEmpty')}
        </div>
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
                  {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="text-sm text-gray-700">
                {t('profile.orderItems', { count: order.items.length })}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{t('profile.total')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {order.total.toLocaleString('en-US')} {t('profile.currency')}
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
