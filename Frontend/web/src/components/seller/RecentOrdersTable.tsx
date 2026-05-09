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
    <div className="surface-card overflow-hidden">
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">{t('recentOrders.title')}</h3>
            <p className="mt-1 text-sm text-slate-500">{t('recentOrders.lastOrders', { count: orders.length })}</p>
          </div>
          <button className="btn btn-outline px-3 py-2 text-xs">
            {t('recentOrders.viewAll')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">{t('recentOrders.columns.orderId')}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">{t('recentOrders.columns.customer')}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">{t('recentOrders.columns.product')}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">{t('recentOrders.columns.quantity')}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">{t('recentOrders.columns.amount')}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">{t('recentOrders.columns.status')}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">{t('recentOrders.columns.payment')}</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">{t('recentOrders.columns.date')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-slate-950">{order.orderId}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-900">{order.customerName}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="line-clamp-1 text-sm text-slate-900">{order.productName}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-900">{order.quantity}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-slate-950">
                    {formatPrice(order.amount, 'SYP')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`status-pill ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`status-pill ${paymentColors[order.payment]}`}>
                    {paymentLabels[order.payment]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
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
