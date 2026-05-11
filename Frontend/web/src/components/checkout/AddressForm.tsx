import { useTranslation } from 'next-i18next';
import { Address } from '@sbay/shared';
import { AlertCircle } from 'lucide-react';
import { CITY_NAMES_AR } from '@/lib/constants';
import { Select } from '@/components/ui/select';

interface AddressFormProps {
  value: Address;
  onChange: (address: Address) => void;
  onSaveAddress?: (save: boolean) => void;
  saveAddressFlag?: boolean;
  errors?: Record<string, string>;
}

/**
 * AddressForm Component - Modern Redesign
 * 
 * Modern inline 2-column layout wie Screenshots
 * - Clean styling
 * - Arabic RTL support
 * - Validation ready
 * 
 * TODO (Mo): Load user's previous addresses from backend
 * GET /api/addresses - returns Address[]
 */
export default function AddressForm({ 
  value, 
  onChange, 
  onSaveAddress,
  saveAddressFlag = false,
  errors = {}
}: AddressFormProps) {
  const { t } = useTranslation('common');

  const handleChange = (field: keyof Address, val: string) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-6">{t('checkout.address.title')}</h3>

      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('checkout.address.fullName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={value.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={t('checkout.address.fullNamePlaceholder')}
            className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-200'
            }`}
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} />
              {errors.name}
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('checkout.address.phone')} <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={value.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder={t('checkout.address.phonePlaceholder')}
            className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-200'
            }`}
          />
          {errors.phone && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} />
              {errors.phone}
            </p>
          )}
        </div>

        {/* City - Full Width */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('checkout.address.city')} <span className="text-red-500">*</span>
          </label>
          <Select
            value={value.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            className={`py-3 ${
              errors.city ? '!border-red-500 focus:!border-red-500 focus:!ring-red-100' : ''
            }`}
          >
            <option value="">{t('checkout.address.cityPlaceholder')}</option>
            {CITY_NAMES_AR.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
          {errors.city && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} />
              {errors.city}
            </p>
          )}
        </div>

        {/* Delivery Address - Full Width */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('checkout.address.street')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={value.street || ''}
            onChange={(e) => handleChange('street', e.target.value)}
            placeholder={t('checkout.address.streetPlaceholder')}
            className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.street ? 'border-red-500' : 'border-gray-200'
            }`}
          />
          {errors.street && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} />
              {errors.street}
            </p>
          )}
        </div>

        {/* Delivery Notes - Full Width, Optional */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('checkout.address.notes')}
          </label>
          <textarea
            value={value.region || ''}
            onChange={(e) => handleChange('region', e.target.value)}
            placeholder={t('checkout.address.notesPlaceholder')}
            rows={3}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Save Address Checkbox */}
      {onSaveAddress && (
        <div className="mt-6 flex items-center gap-2">
          <input
            id="saveAddress"
            type="checkbox"
            checked={saveAddressFlag}
            onChange={(e) => onSaveAddress(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <label htmlFor="saveAddress" className="text-sm text-gray-700">
            {t('checkout.address.saveAddress')}
          </label>
        </div>
      )}
    </div>
  );
}
