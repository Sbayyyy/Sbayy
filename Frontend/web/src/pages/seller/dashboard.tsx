import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import KPICard from '@/components/seller/KPICard';
import RevenueChart from '@/components/seller/RevenueChart';
import SalesChart from '@/components/seller/SalesChart';
import StatusCard from '@/components/seller/StatusCard';
import RecentOrdersTable from '@/components/seller/RecentOrdersTable';
import { SellerStats, Order, DailyRevenue, WeeklySales } from '@sbay/shared';
import { getSellerStats, getRecentOrders, getDailyRevenue, getWeeklySales } from '@/lib/api/seller';
import { DollarSign, ShoppingCart, Users, TrendingUp, Package, CheckCircle, Clock } from 'lucide-react';
import { formatPrice } from '@/lib/cartStore';



export default function SellerDashboard() {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [weeklySales, setWeeklySales] = useState<WeeklySales[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Parallel API calls für bessere Performance
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
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="لوحة التحكم - سباي">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">جارٍ التحميل...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="لوحة التحكم - سباي">
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">
              مرحباً بك! 👋
            </h1>
            <p className="text-gray-600">
              إليك نظرة عامة على أدائك هذا الأسبوع
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="إجمالي الإيرادات"
              value={formatPrice(stats?.totalRevenue || 0, 'SYP')}
              change={stats?.revenueChange || 0}
              icon={<DollarSign size={24} />}
              iconBgColor="bg-green-100"
              iconColor="text-green-600"
            />
            <KPICard
              title="إجمالي الطلبات"
              value={stats?.totalOrders || 0}
              change={stats?.ordersChange || 0}
              icon={<ShoppingCart size={24} />}
              iconBgColor="bg-blue-100"
              iconColor="text-blue-600"
            />
            <KPICard
              title="عملاء جدد"
              value={stats?.newCustomers || 0}
              change={stats?.customersChange || 0}
              icon={<Users size={24} />}
              iconBgColor="bg-purple-100"
              iconColor="text-purple-600"
            />
            <KPICard
              title="معدل التحويل"
              value={`${stats?.conversionRate || 0}%`}
              change={stats?.conversionChange || 0}
              icon={<TrendingUp size={24} />}
              iconBgColor="bg-orange-100"
              iconColor="text-orange-600"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <RevenueChart data={dailyRevenue} />
            <SalesChart data={weeklySales} />
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatusCard
              title="المنتجات النشطة"
              value={stats?.activeProducts || 0}
              subtitle="منتج متاح"
              icon={<Package size={24} />}
              iconBgColor="bg-blue-100"
              iconColor="text-blue-600"
              percentage={82}
            />
            <StatusCard
              title="طلبات مكتملة"
              value={stats?.ordersCompleted || 0}
              subtitle="طلب مكتمل"
              icon={<CheckCircle size={24} />}
              iconBgColor="bg-green-100"
              iconColor="text-green-600"
              percentage={86}
            />
            <StatusCard
              title="بانتظار الشحن"
              value={stats?.awaitingShipment || 0}
              subtitle="طلب ينتظر"
              icon={<Clock size={24} />}
              iconBgColor="bg-orange-100"
              iconColor="text-orange-600"
            />
          </div>

          {/* Recent Orders Table */}
          <RecentOrdersTable orders={recentOrders} />
        </div>
      </div>
    </Layout>
  );
}