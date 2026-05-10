import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { getOrder } from '../lib/api/orders';
import { OrderResponse as Order } from '@sbay/shared';
import { GetServerSideProps } from 'next';

/**
 * Order Confirmation Page
 *
 * Wird nach erfolgreichem Checkout angezeigt
 * URL: /order-confirmation?orderId=ORD-123
 *
 * Features:
 * - Order Details anzeigen
 * - Tracking Info
 * - Lieferstatus
 * - Items Liste
 * - Shipping Address
 * - Payment Method
 * - Next Steps
 */
export default function OrderConfirmationPage() {
  const router = useRouter();
  const { orderId } = router.query;
  const { t, i18n } = useTranslation('common');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    // if it's an array, take the first element
    const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
    if (!normalizedOrderId) {
      setError(t('orderConfirmation.invalidOrderId'));
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const data = await getOrder(normalizedOrderId);
        setOrder(data);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(t('orderConfirmation.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Loading State
  if (loading) {
    return (
      <Layout title={t('orderConfirmation.loadingTitle')}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('orderConfirmation.loadingMessage')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error State
  if (error || !order) {
    return (
      <Layout title={t('orderConfirmation.errorTitle')}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('orderConfirmation.errorTitle')}</h2>
            <p className="text-gray-600 mb-6">{error || t('orderConfirmation.notFound')}</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              {t('orderConfirmation.backHome')}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Success State
  return (
    <Layout title={`${t('orderConfirmation.successTitle')} ${order.id}`}>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Success Card */}
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center" dir="rtl">
            {/* Checkmark Icon */}
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-blue-600" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {t('orderConfirmation.successTitle')}
            </h1>

            {/* Subtitle with Order Number */}
            <p className="text-gray-600 mb-8">
              {t('orderConfirmation.successMessage')} <span className="font-bold text-blue-600">#{order.id}</span>
            </p>

            {/* Order Info Grid */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4 mb-8">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">{t('orderConfirmation.estimatedDelivery')}</span>
                <span className="font-semibold text-gray-900">
                  {t('orderConfirmation.businessDays', { days: order.shippingInfo.estimatedDays })}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">{t('orderConfirmation.deliveryAddress')}</span>
                <span className="font-semibold text-gray-900">
                  {order.shippingAddress?.city || t('orderConfirmation.notSpecified')}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600">{t('orderConfirmation.totalAmount')}</span>
                <span className="font-bold text-blue-600 text-xl">
                  {new Intl.NumberFormat(i18n.language?.startsWith('ar') ? 'ar-SY' : 'en-US', {
                    style: 'currency',
                    currency: 'SYP',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(order.total)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/"
                className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold text-center hover:bg-gray-50 transition-colors"
              >
                {t('orderConfirmation.continueShopping')}
              </Link>
              <Link
                href="/seller/dashboard"
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-center hover:bg-blue-700 transition-colors"
              >
                {t('orderConfirmation.viewOrderStatus')}
              </Link>
            </div>
          </div>


        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common'])),
    },
  };
};
