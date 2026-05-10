import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import KPICard from '@/components/seller/KPICard';
import RevenueChart from '@/components/seller/RevenueChart';
import SalesChart from '@/components/seller/SalesChart';
import StatusCard from '@/components/seller/StatusCard';
import RecentOrdersTable from '@/components/seller/RecentOrdersTable';
import { SellerStats, SellerOrderSummary, DailyRevenue, WeeklySales } from '@sbay/shared';
import { getSellerStats, getRecentOrders, getDailyRevenue, getWeeklySales } from '@/lib/api/seller';
import { AlertCircle, DollarSign, ShoppingCart, Users, TrendingUp, Package, CheckCircle, Clock } from 'lucide-react';
import { formatPrice } from '@/lib/cartStore';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function SellerDashboard() {
  const isAuthed = useRequireAuth();
  const { t } = useTranslation('common');
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<SellerOrderSummary[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [weeklySales, setWeeklySales] = useState<WeeklySales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthed) return;
    loadDashboardData();
  }, [isAuthed]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, ordersData, revenueData, salesData] = await Promise.all([
        getSellerStats(),
        getRecentOrders(10),
        getDailyRevenue(7),
        getWeeklySales(4)
      ]);

      setStats(statsData);
      setRecentOrders(ordersData);
      setDailyRevenue(revenueData);
      setWeeklySales(salesData);
      setError('');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(t('sellerDashboard.loadError', { defaultValue: 'Unable to load seller dashboard.' }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title={t('sellerDashboard.title')}>
        <div className="app-page px-4 py-8">
          <div className="container mx-auto">
            <div className="mb-8">
              <div className="skeleton mb-3 h-8 w-64" />
              <div className="skeleton h-5 w-96 max-w-full" />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="surface-card p-6">
                  <div className="skeleton mb-4 h-10 w-10 rounded-2xl" />
                  <div className="skeleton mb-2 h-4 w-24" />
                  <div className="skeleton h-7 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('sellerDashboard.title')}>
      <div className="app-page">
        <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
          <div className="container mx-auto px-4 py-6">
            <p className="page-kicker">{t('nav.dashboard')}</p>
            <h1 className="page-title">{t('sellerDashboard.welcome')}</h1>
            <p className="page-subtitle">{t('sellerDashboard.subtitle')}</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title={t('sellerDashboard.totalRevenue')}
              value={formatPrice(stats?.totalRevenue || 0, 'SYP')}
              change={stats?.revenueChange || 0}
              icon={<DollarSign size={24} />}
              iconBgColor="bg-emerald-100"
              iconColor="text-emerald-600"
            />
            <KPICard
              title={t('sellerDashboard.totalOrders')}
              value={stats?.totalOrders || 0}
              change={stats?.ordersChange || 0}
              icon={<ShoppingCart size={24} />}
              iconBgColor="bg-primary-100"
              iconColor="text-primary-600"
            />
            <KPICard
              title={t('sellerDashboard.newCustomers')}
              value={stats?.newCustomers || 0}
              change={stats?.customersChange || 0}
              icon={<Users size={24} />}
              iconBgColor="bg-violet-100"
              iconColor="text-violet-600"
            />
            <KPICard
              title={t('sellerDashboard.conversionRate')}
              value={`${stats?.conversionRate || 0}%`}
              change={stats?.conversionChange || 0}
              icon={<TrendingUp size={24} />}
              iconBgColor="bg-amber-100"
              iconColor="text-amber-600"
            />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RevenueChart data={dailyRevenue} />
            <SalesChart data={weeklySales} />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <StatusCard
              title={t('sellerDashboard.activeProducts')}
              value={stats?.activeProducts || 0}
              subtitle={t('sellerDashboard.activeProductsSub')}
              icon={<Package size={24} />}
              iconBgColor="bg-primary-100"
              iconColor="text-primary-600"
              percentage={82}
            />
            <StatusCard
              title={t('sellerDashboard.completedOrders')}
              value={stats?.ordersCompleted || 0}
              subtitle={t('sellerDashboard.completedOrdersSub')}
              icon={<CheckCircle size={24} />}
              iconBgColor="bg-emerald-100"
              iconColor="text-emerald-600"
              percentage={86}
            />
            <StatusCard
              title={t('sellerDashboard.awaitingShipment')}
              value={stats?.awaitingShipment || 0}
              subtitle={t('sellerDashboard.awaitingShipmentSub')}
              icon={<Clock size={24} />}
              iconBgColor="bg-amber-100"
              iconColor="text-amber-600"
            />
          </div>

          <RecentOrdersTable orders={recentOrders} />
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ locale }: { locale?: string }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'ar', ['common'])) } };
}
