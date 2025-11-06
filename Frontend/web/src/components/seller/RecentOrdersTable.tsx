// components/seller/RecentOrdersTable.tsx
import { Order } from '@sbay/shared';
import { formatPrice } from '@/lib/cartStore';

interface RecentOrdersTableProps {
  orders: Order[];
}

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const statusColors: Record<Order['status'], string> = {
    Shipped: 'bg-blue-100 text-blue-800',
    Processing: 'bg-yellow-100 text-yellow-800',
    Delivered: 'bg-green-100 text-green-800',
    Pending: 'bg-gray-100 text-gray-800'
  };

  const paymentColors: Record<Order['payment'], string> = {
    Paid: 'bg-green-100 text-green-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    Waiting: 'bg-orange-100 text-orange-800'
  };

  const statusLabels: Record<Order['status'], string> = {
    Shipped: 'تم الشحن',
    Processing: 'قيد المعالجة',
    Delivered: 'تم التوصيل',
    Pending: 'قيد الانتظار'
  };

  const paymentLabels: Record<Order['payment'], string> = {
    Paid: 'مدفوع',
    Pending: 'قيد الانتظار',
    Waiting: 'في الانتظار'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">الطلبات الأخيرة</h3>
            <p className="text-sm text-gray-500 mt-1">آخر {orders.length} طلبات</p>
          </div>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            عرض الكل ←
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الطلب</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العميل</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المبلغ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدفع</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
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