// components/seller/RecentOrdersTable.tsx
import { SellerOrderSummary } from '@sbay/shared';
import { formatPrice } from '@/lib/cartStore';
import { useTranslation } from 'next-i18next';

interface RecentOrdersTableProps {
  orders: SellerOrderSummary[];
}

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const { t } = useTranslation('common');

  const statusColors: Record<SellerOrderSummary['status'], string> = {
    Shipped: 'bg-blue-100 text-blue-800',
    Processing: 'bg-yellow-100 text-yellow-800',
    Delivered: 'bg-green-100 text-green-800',
    Pending: 'bg-gray-100 text-gray-800'
  };

  const paymentColors: Record<SellerOrderSummary['payment'], string> = {
    Paid: 'bg-green-100 text-green-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    Waiting: 'bg-orange-100 text-orange-800'
  };

  const statusLabels: Record<SellerOrderSummary['status'], string> = {
    Shipped: t('recentOrders.status.shipped'),
    Processing: t('recentOrders.status.processing'),
    Delivered: t('recentOrders.status.delivered'),
    Pending: t('recentOrders.status.pending')
  };

  const paymentLabels: Record<SellerOrderSummary['payment'], string> = {
    Paid: t('recentOrders.payment.paid'),
    Pending: t('recentOrders.payment.pending'),
    Waiting: t('recentOrders.payment.waiting')
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('recentOrders.title')}</h3>
            <p className="text-sm text-gray-500 mt-1">{t('recentOrders.lastOrders', { count: orders.length })}</p>
          </div>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            {t('recentOrders.viewAll')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('recentOrders.columns.orderId')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('recentOrders.columns.customer')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('recentOrders.columns.product')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('recentOrders.columns.quantity')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('recentOrders.columns.amount')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('recentOrders.columns.status')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('recentOrders.columns.payment')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('recentOrders.columns.date')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{order.orderId}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{order.customerName}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900 line-clamp-1">{order.productName}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{order.quantity}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {formatPrice(order.amount, 'SYP')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${paymentColors[order.payment]}`}>
                    {paymentLabels[order.payment]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
