import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { getCurrentUser, updateProfile, UpdateProfileRequest } from '@/lib/api/users';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { getMyListings } from '@/lib/api/listings';
import { getPurchases } from '@/lib/api/orders';
import { getFavorites, removeFavorite } from '@/lib/api/favorites';
import { api } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import type { Product, OrderResponse } from '@sbay/shared';
import {
  Mail,
  Phone,
  MapPin,
  Package,
  ShoppingBag,
  Settings,
  Star,
  Calendar,
  Edit2,
  Shield,
  Bell,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function ProfilePage() {
  const { t } = useTranslation('common');
  const { user, isAuthenticated, setUser } = useAuthStore();
  const isAuthed = useRequireAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'purchases' | 'watchlist'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: user?.city || '',
    avatar: user?.avatar || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [listings, setListings] = useState<Product[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState('');
  const [purchases, setPurchases] = useState<OrderResponse[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesError, setPurchasesError] = useState('');
  const [watchlist, setWatchlist] = useState<Product[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [watchlistError, setWatchlistError] = useState('');
  const [watchlistLoaded, setWatchlistLoaded] = useState(false);

  const loadUserData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        city: userData.city || '',
        avatar: userData.avatar || ''
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error(t('profile.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, setUser, t]);

  const loadListings = useCallback(async () => {
    try {
      setListingsLoading(true);
      setListingsError('');
      const data = await getMyListings();
      setListings(data);
    } catch (error) {
      console.error('Error loading listings:', error);
      setListingsError(t('profile.listingsError'));
    } finally {
      setListingsLoading(false);
    }
  }, [t]);

  const loadPurchases = useCallback(async () => {
    try {
      setPurchasesLoading(true);
      setPurchasesError('');
      const data = await getPurchases(1, 10);
      setPurchases(data.orders || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
      setPurchasesError(t('profile.purchasesError'));
    } finally {
      setPurchasesLoading(false);
    }
  }, [t]);

  const loadWatchlist = useCallback(async () => {
    try {
      setWatchlistLoading(true);
      setWatchlistError('');
      const data = await getFavorites();
      setWatchlist(data);
      setWatchlistLoaded(true);
    } catch (error) {
      console.error('Error loading watchlist:', error);
      setWatchlistError(t('profile.watchlistError'));
      setWatchlistLoaded(true);
    } finally {
      setWatchlistLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadUserData();
    loadListings();
    loadPurchases();
  }, [isAuthenticated, loadListings, loadPurchases, loadUserData]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'watchlist' && !watchlistLoaded && !watchlistLoading) {
      loadWatchlist();
    }
  }, [activeTab, isAuthenticated, loadWatchlist, watchlist.length, watchlistLoading, watchlistLoaded]);
  
  useEffect(() => {
    if (isAuthenticated) return;
    setWatchlistLoaded(false);
    setWatchlist([]);
    setWatchlistError('');
  }, [isAuthenticated]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const updateData: UpdateProfileRequest = {
          displayName: formData.name,
          phone: formData.phone,
          city: formData.city,
          avatar: formData.avatar
        };

      const updatedUser = await updateProfile(updateData);
      setUser(updatedUser);
      setIsEditing(false);
      toast.success(t('profile.saveSuccess'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('profile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        city: user?.city || '',
        avatar: user?.avatar || ''
      });
    setIsEditing(false);
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('files', file);
      const response = await api.post<{ urls: string[] }>('/uploads/images', formDataUpload);
      const url = response.data.urls?.[0];
      if (!url) throw new Error('Upload failed');
      setFormData((prev) => ({ ...prev, avatar: url }));
      toast.success(t('profile.avatarUpdated'));
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(t('profile.avatarError'));
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  };

  if (!isAuthed) return null;

  if (isLoading) {
    return (
      <Layout title={t('profile.title')}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('profile.loading')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalRevenue = user?.totalRevenue ?? 0;
  const totalOrders = user?.totalOrders ?? 0;
  const pendingOrders = user?.pendingOrders ?? 0;
  const reviewCount = user?.reviewCount ?? 0;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : t('profile.unknown');
  const recentListing = listings[0];
  const recentPurchase = purchases[0];
  const activities = [
    recentListing
      ? {
          type: 'listing',
          title: t('profile.activity.listingTitle'),
          description: recentListing.title,
          date: recentListing.createdAt
        }
      : null,
    recentPurchase
      ? {
          type: 'purchase',
          title: t('profile.activity.purchaseTitle'),
          description: t('profile.activity.purchaseBody', { id: recentPurchase.id.slice(0, 8) }),
          date: recentPurchase.createdAt
        }
      : null
  ].filter(Boolean) as Array<{ type: 'listing' | 'purchase'; title: string; description: string; date: string }>;

  return (
    <Layout title={t('profile.title')}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            {t('profile.backToHome')}
          </Link>

          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 bg-primary-100 rounded-full overflow-hidden flex items-center justify-center">
                    {formData.avatar || user?.avatar ? (
                      <img
                        src={formData.avatar || user?.avatar}
                        alt={user?.name || t('nav.user')}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-primary-600 font-bold text-3xl">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <>
                      <input
                        id="avatarUpload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="avatarUpload"
                        className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer"
                      >
                        {avatarUploading ? t('profile.avatarUploading') : t('profile.avatarChange')}
                      </label>
                    </>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold text-gray-900"
                        />
                      ) : (
                        <h1 className="text-2xl font-bold text-gray-900">{user?.name || t('nav.user')}</h1>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span>{t('profile.sellerRating', { rating: (user?.rating ?? 0).toFixed(1) })}</span>
                        <span className="text-gray-400">·</span>
                        <span>{t('profile.reviewCount', { count: reviewCount })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                        <Calendar className="w-4 h-4" />
                        <span>{t('profile.memberSince', { date: memberSince })}</span>
                      </div>
                    </div>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        <Edit2 className="w-4 h-4" />
                        {t('profile.editProfile')}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                          {isSaving ? t('profile.saving') : t('profile.save')}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          {t('profile.cancel')}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span>{user?.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Phone className="w-5 h-5 text-gray-400" />
                      {isEditing ? (
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder={t('profile.phonePlaceholder')}
                        />
                      ) : (
                        <span>{user?.phone || t('profile.phoneNotSet')}</span>
                      )}
                    </div>
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder={t('profile.cityPlaceholder')}
                          />
                        ) : (
                          <span>{user?.city || t('profile.cityNotSet')}</span>
                        )}
                      </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Package className="w-5 h-5 text-gray-400" />
                      <span>{t('profile.itemsSold', { count: totalOrders })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:w-64">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">{t('profile.totalRevenue')}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {totalRevenue.toLocaleString('en-US')} {t('profile.currency')}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">{t('profile.totalOrders')}</p>
                  <p className="text-lg font-semibold text-gray-900">{totalOrders}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">{t('profile.pendingOrders')}</p>
                  <p className="text-lg font-semibold text-gray-900">{pendingOrders}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">{t('profile.reviews')}</p>
                  <p className="text-lg font-semibold text-gray-900">{reviewCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {['overview', 'listings', 'purchases', 'watchlist'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  activeTab === tab
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {t(`profile.tabs.${tab}`)}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('profile.recentActivity')}
                </h2>
                {activities.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
                    {t('profile.activityEmpty')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity, index) => (
                      <div
                        key={`${activity.type}-${index}`}
                        className={`flex items-start gap-4 ${index < activities.length - 1 ? 'pb-4 border-b' : ''}`}
                      >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          activity.type === 'listing' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {activity.type === 'listing' ? (
                            <Package className="w-6 h-6 text-blue-600" />
                          ) : (
                            <ShoppingBag className="w-6 h-6 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-500">{activity.description}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('profile.accountSettings')}
                </h2>
                <div className="space-y-3">
                  <button className="w-full flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                    <Settings className="w-5 h-5" />
                    {t('profile.settings.preferences')}
                  </button>
                  <button className="w-full flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                    <Shield className="w-5 h-5" />
                    {t('profile.settings.privacy')}
                  </button>
                  <button className="w-full flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                    <Bell className="w-5 h-5" />
                    {t('profile.settings.notifications')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'listings' && (
            <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('profile.listingsTitle')}</h2>
                <Link
                  href="/listing/sell"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {t('profile.createListing')}
                </Link>
              </div>
              {listingsLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {t('profile.loadingListings')}
                </div>
              ) : listingsError ? (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
                  <AlertCircle className="w-4 h-4" />
                  {listingsError}
                </div>
              ) : listings.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
                  {t('profile.listingsEmpty')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'purchases' && (
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
          )}

          {activeTab === 'watchlist' && (
            <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.watchlistTitle')}</h2>
              {watchlistLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {t('profile.loadingWatchlist')}
                </div>
              ) : watchlistError ? (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
                  <AlertCircle className="w-4 h-4" />
                  {watchlistError}
                </div>
              ) : watchlist.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
                  {t('profile.watchlistEmpty')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {watchlist.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isFavorite={true}
                      onFavorite={(id) => {
                        removeFavorite(id).catch(() => undefined);
                        setWatchlist(prev => prev.filter(item => item.id !== id));
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}
