import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';import { toast } from '@/lib/toast';
import ConfirmDialog from '@/components/ConfirmDialog';import { getOrder, updateOrderStatus, cancelOrder } from '@/lib/api/orders';
import { OrderResponse } from '@sbay/shared';
import { useAuthStore } from '@/lib/store';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock,
  MapPin,
  Phone,
  User,
  CreditCard,
  MessageSquare,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Calendar,
  DollarSign
} from 'lucide-react';
import Head from 'next/head';

export default function OrderDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuthStore();
  
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (id) {
      loadOrder();
    }
  }, [id, isAuthenticated]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await getOrder(id as string);
      setOrder(data);
      setError('');
    } catch (err) {
      console.error('Error loading order:', err);
      setError('حدث خطأ في تحميل الطلب');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled') => {
    if (!order) return;
    
    try {
      setUpdating(true);
      await updateOrderStatus(order.id, newStatus as any);
      setOrder({ ...order, status: newStatus });
      alert('تم تحديث حالة الطلب بنجاح');
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('حدث خطأ في تحديث حالة الطلب');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;
    
    try {
      setUpdating(true);
      await cancelOrder(order.id);
      setOrder({ ...order, status: 'cancelled' });
      alert('تم إلغاء الطلب بنجاح');
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert('حدث خطأ في إلغاء الطلب');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      case 'confirmed':
        return <Package className="w-6 h-6 text-blue-600" />;
      case 'shipped':
        return <Truck className="w-6 h-6 text-purple-600" />;
      case 'delivered':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Package className="w-6 h-6 text-gray-600" />;
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ar-SY', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Order Timeline Steps
  const getTimelineSteps = () => {
    if (!order) return [];
    
    const steps = [
      { status: 'pending', label: 'تم إنشاء الطلب', completed: true },
      { status: 'confirmed', label: 'تم التأكيد', completed: order.status !== 'pending' && order.status !== 'cancelled' },
      { status: 'shipped', label: 'تم الشحن', completed: order.status === 'shipped' || order.status === 'delivered' },
      { status: 'delivered', label: 'تم التوصيل', completed: order.status === 'delivered' }
    ];
    
    return steps;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">خطأ في تحميل الطلب</h2>
            <p className="text-gray-600 mb-6">{error || 'الطلب غير موجود'}</p>
            <Link href="/dashboard/orders/purchases" className="btn-primary">
              العودة للطلبات
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>تفاصيل الطلب #{order.id.slice(0, 8)} - Sbay سباي</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard/orders/purchases"
              className="inline-flex items-center gap-2 text-primary hover:underline mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              العودة للطلبات
            </Link>
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  الطلب #{order.id.slice(0, 8)}
                </h1>
                <p className="text-gray-600 mt-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-lg border-2 flex items-center gap-2 ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="font-medium">{getStatusLabel(order.status)}</span>
              </div>
            </div>
          </div>

          {/* Order Timeline */}
          {order.status !== 'cancelled' && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-6">حالة الطلب</h2>
              <div className="relative">
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" style={{ zIndex: 0 }}></div>
                <div className="grid grid-cols-4 gap-4 relative" style={{ zIndex: 1 }}>
                  {getTimelineSteps().map((step, index) => (
                    <div key={step.status} className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        step.completed 
                          ? 'bg-primary text-white' 
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      <p className={`text-sm text-center ${
                        step.completed ? 'text-gray-900 font-medium' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold">المنتجات</h2>
                </div>
                <div className="p-6 space-y-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                        <Package className="w-10 h-10 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">
                          منتج #{item.productId.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-600">
                          السعر: {formatPrice(item.price)}
                        </p>
                        <p className="text-sm text-gray-600">
                          الكمية: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold">عنوان الشحن</h2>
                </div>
                <div className="p-6">
                  {order.shippingAddress ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <p className="text-gray-900">{order.shippingAddress.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <p className="text-gray-900" dir="ltr">{order.shippingAddress.phone}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-gray-900">{order.shippingAddress.street}</p>
                          <p className="text-gray-600">{order.shippingAddress.city}</p>
                          {order.shippingAddress.region && (
                            <p className="text-gray-600">{order.shippingAddress.region}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">لا توجد معلومات عنوان التوصيل</p>
                  )}
                </div>
              </div>

              {/* Shipping Info */}
              {order.shippingInfo && (
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold">معلومات الشحن</h2>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">شركة الشحن:</span>
                      <span className="font-medium text-gray-900">
                        {order.shippingInfo.carrier === 'dhl' ? 'DHL' : 'أخرى'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">تكلفة الشحن:</span>
                      <span className="font-medium text-gray-900">
                        {formatPrice(order.shippingInfo.cost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">مدة التوصيل المتوقعة:</span>
                      <span className="font-medium text-gray-900">
                        {order.shippingInfo.estimatedDays} أيام
                      </span>
                    </div>
                    {order.shippingInfo.trackingNumber && (
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600 mb-2">رقم التتبع:</p>
                        <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                          {order.shippingInfo.trackingNumber}
                        </code>
                        <a
                          href={`https://track.dhl.com/${order.shippingInfo.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline mt-3 w-full text-center"
                        >
                          <Truck className="w-4 h-4 inline ml-2" />
                          تتبع الشحنة
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold">ملخص الطلب</h2>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>المجموع الفرعي:</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>الشحن:</span>
                    <span>{formatPrice(order.shippingInfo.cost)}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between">
                    <span className="font-bold text-lg">المجموع الكلي:</span>
                    <span className="font-bold text-2xl text-primary">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
                    <CreditCard className="w-4 h-4" />
                    <span>
                      {order.paymentMethod === 'cod' 
                        ? 'الدفع عند الاستلام' 
                        : order.paymentMethod === 'bank_transfer' 
                        ? 'تحويل بنكي' 
                        : 'اللقاء شخصياً'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg shadow p-6 space-y-3">
                <h3 className="font-bold mb-4">الإجراءات</h3>
                
                <button className="btn-primary w-full">
                  <MessageSquare className="w-4 h-4 inline ml-2" />
                  تواصل مع البائع
                </button>

                {order.status === 'pending' && (
                  <button
                    onClick={handleCancelOrder}
                    disabled={updating}
                    className="btn-outline w-full border-red-300 text-red-700 hover:bg-red-50"
                  >
                    {updating ? (
                      <Loader2 className="w-4 h-4 animate-spin inline ml-2" />
                    ) : (
                      <XCircle className="w-4 h-4 inline ml-2" />
                    )}
                    إلغاء الطلب
                  </button>
                )}

                {order.status === 'delivered' && (
                  <button className="btn-outline w-full">
                    <CheckCircle className="w-4 h-4 inline ml-2" />
                    تقييم الطلب
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
