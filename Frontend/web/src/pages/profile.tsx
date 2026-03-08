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
import type { Product, OrderResponse } from '@sbay/shared';
import { defaultTextInputValidator, loadProfanityListFromUrl, sanitizeInput } from '@sbay/shared';
import { ArrowLeft } from 'lucide-react';
import { CITIES, normalizeCityValue } from '@/lib/constants';
import {
  ProfileHeader,
  ProfileOverviewTab,
  ProfileListingsTab,
  ProfilePurchasesTab,
  ProfileWatchlistTab,
} from '@/components/profile';
import type { ProfileFormData, ProfileErrors } from '@/components/profile';

export default function ProfilePage() {
  const { t } = useTranslation('common');
  const { user, isAuthenticated, setUser } = useAuthStore();
  const isAuthed = useRequireAuth();

  const cityOptions = CITIES.map(c => ({
    value: c.value,
    label: t(c.i18nKey, { defaultValue: c.i18nDefault })
  }));

  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'purchases' | 'watchlist'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: normalizeCityValue(user?.city || ''),
    avatar: user?.avatar || ''
  });
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
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
        city: normalizeCityValue(userData.city || ''),
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
    void loadProfanityListFromUrl('/profanities.txt');
  }, []);

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

  const validateProfile = () => {
    const unsafeMessage = 'Input contains disallowed content';
    const nextErrors: ProfileErrors = {};
    const nameValue = formData.name;
    const phoneValue = formData.phone;
    const cityValue = formData.city;

    if (!defaultTextInputValidator.validate(nameValue).isValid) {
      nextErrors.name = defaultTextInputValidator.validate(nameValue).message ?? unsafeMessage;
    }
    if (phoneValue && !defaultTextInputValidator.validate(phoneValue).isValid) {
      nextErrors.phone = defaultTextInputValidator.validate(phoneValue).message ?? unsafeMessage;
    }
    if (cityValue && !defaultTextInputValidator.validate(cityValue).isValid) {
      nextErrors.city = defaultTextInputValidator.validate(cityValue).message ?? unsafeMessage;
    }

    setProfileErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateProfile()) return;
    setIsSaving(true);
    try {
        const updateData: UpdateProfileRequest = {
          displayName: sanitizeInput(formData.name),
          phone: sanitizeInput(formData.phone),
          city: sanitizeInput(formData.city),
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
        city: normalizeCityValue(user?.city || ''),
        avatar: user?.avatar || ''
      });
    setProfileErrors({});
    setIsEditing(false);
  };

  const handleProfileFieldChange = (field: 'name' | 'phone' | 'city', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    const unsafeMessage = 'Input contains disallowed content';
    const inputValue = sanitizeInput(value);
    const validation = defaultTextInputValidator.validate(inputValue);
    setProfileErrors((prev) => ({
      ...prev,
      [field]: validation.isValid ? undefined : validation.message ?? unsafeMessage
    }));
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

  const handleRemoveFavorite = (id: string) => {
    removeFavorite(id).catch(() => undefined);
    setWatchlist(prev => prev.filter(item => item.id !== id));
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
          type: 'listing' as const,
          title: t('profile.activity.listingTitle'),
          description: recentListing.title,
          date: recentListing.createdAt
        }
      : null,
    recentPurchase
      ? {
          type: 'purchase' as const,
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

          <ProfileHeader
            user={user}
            formData={formData}
            setFormData={setFormData}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            handleSave={handleSave}
            handleCancel={handleCancel}
            handleProfileFieldChange={handleProfileFieldChange}
            handleAvatarChange={handleAvatarChange}
            profileErrors={profileErrors}
            isSaving={isSaving}
            avatarUploading={avatarUploading}
            cityOptions={cityOptions}
            totalRevenue={totalRevenue}
            totalOrders={totalOrders}
            pendingOrders={pendingOrders}
            reviewCount={reviewCount}
            memberSince={memberSince}
            t={t}
          />

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
            <ProfileOverviewTab activities={activities} t={t} />
          )}

          {activeTab === 'listings' && (
            <ProfileListingsTab
              listings={listings}
              listingsLoading={listingsLoading}
              listingsError={listingsError}
              t={t}
            />
          )}

          {activeTab === 'purchases' && (
            <ProfilePurchasesTab
              purchases={purchases}
              purchasesLoading={purchasesLoading}
              purchasesError={purchasesError}
              t={t}
            />
          )}

          {activeTab === 'watchlist' && (
            <ProfileWatchlistTab
              watchlist={watchlist}
              watchlistLoading={watchlistLoading}
              watchlistError={watchlistError}
              onRemoveFavorite={handleRemoveFavorite}
              t={t}
            />
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
