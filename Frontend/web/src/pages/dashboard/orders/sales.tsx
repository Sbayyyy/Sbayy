import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { getSales, updateOrderStatus } from '@/lib/api/orders';
import { OrderResponse } from '@sbay/shared';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock,
  MessageSquare,
  Edit,
  AlertCircle,
  Loader2,
  ArrowLeft,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import Head from 'next/head';

export default function SalesPage() {
  const isAuthed = useRequireAuth();
  
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0
  });

  useEffect(() => {
    if (!isAuthed) return;
    loadOrders();
  }, [isAuthed, statusFilter, page]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getSales(page, 20);
      
      let filteredOrders = data.orders || [];
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
      }
      
      setOrders(filteredOrders);
      setHasMore(data.total > page * 20);
      
      // Calculate stats
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
      const pendingOrders = filteredOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
      const completedOrders = filteredOrders.filter(o => o.status === 'delivered').length;
      
      setStats({ totalRevenue, pendingOrders, completedOrders });
      setError('');
    } catch (err) {
      console.error('Error loading sales:', err);
      setError('حدث خطأ في تحميل المبيعات');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled') => {
    try {
      setUpdatingStatus(orderId);
      await updateOrderStatus(orderId, newStatus as any);
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      
      // Show success (could use toast notification)
      alert('تم تحديث حالة الطلب بنجاح');
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('حدث خطأ في تحديث حالة الطلب');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'confirmed':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-purple-600" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'قيد الانتظار';
      case 'confirmed':
        return 'تم التأكيد';
      case 'shipped':
        return 'قيد الشحن';
      case 'delivered':
        return 'تم التوصيل';
      case 'cancelled':
        return 'ملغى';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ar-SY', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Layout>
      <Head>
        <title>مبيعاتي - Sbay سباي</title>
        <meta name="description" content="إدارة مبيعاتك وطلباتك" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/seller/dashboard"
              className="inline-flex items-center gap-2 text-primary hover:underline mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              العودة للوحة التحكم
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">مبيعاتي</h1>
            <p className="text-gray-600 mt-2">
              إدارة طلبات العملاء وتحديث حالة الشحن
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(stats.totalRevenue)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">طلبات قيد المعالجة</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.pendingOrders}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">طلبات مكتملة</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.completedOrders}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'الكل', count: orders.length },
                { value: 'pending', label: 'قيد الانتظار' },
                { value: 'confirmed', label: 'تم التأكيد' },
                { value: 'shipped', label: 'قيد الشحن' },
                { value: 'delivered', label: 'تم التوصيل' },
                { value: 'cancelled', label: 'ملغى' }
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => {
                    if (statusFilter !== tab.value) {
                      setStatusFilter(tab.value);
                      setPage(1);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && ` (${tab.count})`}
                </button>
              ))}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : orders.length > 0 ? (
            /* Orders List */
            <div className="space-y-4">
              {orders.map(order => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  {/* Order Header */}
                  <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <p className="text-sm text-gray-600">
                          طلب رقم #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4">
                    <div className="space-y-3 mb-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              منتج #{item.productId.slice(0, 8)}
                            </p>
                            <p className="text-sm text-gray-600">
                              الكمية: {item.quantity} × {formatPrice(item.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Customer Info */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        معلومات العميل:
                      </p>
                      {order.shippingAddress ? (
                        <>
                          <p className="text-sm text-gray-600">
                            {order.shippingAddress.name} • {order.shippingAddress.phone}
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.shippingAddress.street}, {order.shippingAddress.city}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">لا توجد معلومات عنوان</p>
                      )}
                    </div>

                    {/* Totals */}
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                      <div className="text-sm text-gray-600">
                        <p>طريقة الدفع: {order.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : order.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'اللقاء شخصياً'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">المجموع الكلي</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatPrice(order.total)}
                        </p>
                      </div>
                    </div>

                    {/* Status Update */}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          تحديث حالة الطلب:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                              disabled={updatingStatus === order.id}
                              className="btn-primary text-sm"
                            >
                              تأكيد الطلب
                            </button>
                          )}
                          {order.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'shipped')}
                              disabled={updatingStatus === order.id}
                              className="btn-primary text-sm"
                            >
                              تم الشحن
                            </button>
                          )}
                          {order.status === 'shipped' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'delivered')}
                              disabled={updatingStatus === order.id}
                              className="btn-primary text-sm"
                            >
                              تم التوصيل
                            </button>
                          )}
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                              disabled={updatingStatus === order.id}
                              className="btn-outline text-sm border-red-300 text-red-700 hover:bg-red-50"
                            >
                              إلغاء الطلب
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="btn-primary flex-1 sm:flex-none text-center"
                      >
                        <Package className="w-4 h-4 inline ml-2" />
                        تفاصيل الطلب
                      </Link>
                      
                      <button className="btn-outline flex-1 sm:flex-none">
                        <MessageSquare className="w-4 h-4 inline ml-2" />
                        تواصل مع العميل
                      </button>

                      {order.status === 'shipped' && (
                        <button className="btn-outline flex-1 sm:flex-none">
                          <Edit className="w-4 h-4 inline ml-2" />
                          تحديث رقم التتبع
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-lg shadow p-16 text-center">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                لا توجد مبيعات بعد
              </h3>
              <p className="text-gray-600 mb-6">
                لم تبع أي منتجات حتى الآن
              </p>
              <Link href="/listing/sell" className="btn-primary">
                أضف منتج للبيع
              </Link>
            </div>
          )}

          {/* Load More */}
          {hasMore && orders.length > 0 && (
            <div className="text-center mt-6">
              <button
                onClick={() => setPage(prev => prev + 1)}
                className="btn-outline"
              >
                تحميل المزيد
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
