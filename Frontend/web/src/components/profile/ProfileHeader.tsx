import {
  Mail,
  Phone,
  MapPin,
  Package,
  Star,
  Calendar,
  Edit2,
} from 'lucide-react';
import type { User } from '@sbay/shared';
import type { ProfileFormData, ProfileErrors, TranslationFn } from './types';
import { getCityI18nKeyFromValue, getCityLabel } from '@/lib/constants';
import { formatPrice } from '@/lib/formatters';
import { Select } from '@/components/ui/select';

interface CityOption {
  value: string;
  label: string;
}

interface ProfileHeaderProps {
  user: User | null;
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  handleProfileFieldChange: (field: 'name' | 'phone' | 'city', value: string) => void;
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  profileErrors: ProfileErrors;
  isSaving: boolean;
  avatarUploading: boolean;
  cityOptions: CityOption[];
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  reviewCount: number;
  memberSince: string;
  t: TranslationFn;
}

export default function ProfileHeader({
  user,
  formData,
  isEditing,
  setIsEditing,
  handleSave,
  handleCancel,
  handleProfileFieldChange,
  handleAvatarChange,
  profileErrors,
  isSaving,
  avatarUploading,
  cityOptions,
  totalRevenue,
  totalOrders,
  pendingOrders,
  reviewCount,
  memberSince,
  t,
}: ProfileHeaderProps) {
  const cityI18nKey = getCityI18nKeyFromValue(user?.city);
  const cityLabel = user?.city
    ? cityI18nKey
      ? t(cityI18nKey)
      : getCityLabel(user.city)
    : '';

  return (
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
                    onChange={(e) => handleProfileFieldChange('name', e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold text-gray-900"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">{user?.name || t('nav.user')}</h1>
                )}
                {isEditing && profileErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{profileErrors.name}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{t('profile.sellerRating', { rating: (user?.rating ?? 0).toFixed(1) })}</span>
                  <span className="text-gray-400">&middot;</span>
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
                    onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder={t('profile.phonePlaceholder')}
                  />
                ) : (
                  <span>{user?.phone || t('profile.phoneNotSet')}</span>
                )}
                {isEditing && profileErrors.phone && (
                  <p className="text-xs text-red-500 mt-1">{profileErrors.phone}</p>
                )}
              </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  {isEditing ? (
                    <Select
                      value={formData.city}
                      onChange={(e) => handleProfileFieldChange('city', e.target.value)}
                      className="text-sm"
                    >
                      <option value="">{t('profile.cityPlaceholder')}</option>
                      {cityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <span>{cityLabel || t('profile.cityNotSet')}</span>
                  )}
                  {isEditing && profileErrors.city && (
                    <p className="text-xs text-red-500 mt-1">{profileErrors.city}</p>
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
              {formatPrice(totalRevenue, 'en')}
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
  );
}
