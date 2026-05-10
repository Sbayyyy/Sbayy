import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import {
  defaultTextInputValidator,
  IValidator,
  getListingTitleValidationMessage,
  getListingDescriptionValidationMessage,
  getListingPriceValidationMessage,
  getListingCategoryValidationMessage,
  getListingLocationValidationMessage,
  loadProfanityListFromUrl,
  sanitizeInput
} from '@sbay/shared';
import type { ProductCreate } from '@sbay/shared';
import { createListing } from '../../lib/api/listings';
import { getCurrentUser } from '@/lib/api/users';
import { getErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '../../lib/store';
import ImageUpload from '../../components/imageUpload';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { SELL_CATEGORIES, FILTER_CONDITIONS } from '@/lib/constants';

// Extended type for form state to allow empty strings for numeric fields
interface ProductFormData {
  title: string;
  description: string;
  priceAmount: number | string;
  priceCurrency?: string;
  imageUrls?: string[];
  categoryPath: string;
  condition: string;  // "New" | "Used" | "Refurbished"
  region: string;
  stock?: number | string;
}

export default function SellPage() {
  const router = useRouter();
  const { isAuthenticated, setUser } = useAuthStore();
  const isAuthed = useRequireAuth();
  const { t } = useTranslation('common');
  
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    priceAmount: '',
    priceCurrency: 'SYP',
    imageUrls: [],
    categoryPath: '',
    condition: 'New',
    region: '',
    stock: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    void loadProfanityListFromUrl('/profanities.txt');
  }, []);

  const fieldValidators: Partial<Record<keyof ProductFormData, IValidator<string>>> = {
    title: defaultTextInputValidator,
    description: defaultTextInputValidator,
    categoryPath: defaultTextInputValidator,
    region: defaultTextInputValidator
  };

  if (isAuthed === undefined) {
    return (
      <Layout title={t('common.loading')}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthed) {
    return null;
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const unsafeMessage = t('sell.validation.unsafeContent');

    const titleError = getListingTitleValidationMessage(sanitizeInput(formData.title));
    if (titleError) newErrors.title = titleError;
    if (!newErrors.title && fieldValidators.title) {
      const result = fieldValidators.title.validate(sanitizeInput(formData.title));
      if (!result.isValid) newErrors.title = result.message ?? unsafeMessage;
    }

    const descError = getListingDescriptionValidationMessage(sanitizeInput(formData.description));
    if (descError) newErrors.description = descError;
    if (!newErrors.description && fieldValidators.description) {
      const result = fieldValidators.description.validate(sanitizeInput(formData.description));
      if (!result.isValid) newErrors.description = result.message ?? unsafeMessage;
    }

    const priceError = getListingPriceValidationMessage(
      formData.priceAmount === '' ? NaN : formData.priceAmount
    );
    if (priceError) newErrors.priceAmount = priceError;

    const categoryError = getListingCategoryValidationMessage(formData.categoryPath);
    if (categoryError) newErrors.categoryPath = categoryError;
    if (!newErrors.categoryPath && fieldValidators.categoryPath) {
      const result = fieldValidators.categoryPath.validate(formData.categoryPath);
      if (!result.isValid) newErrors.categoryPath = result.message ?? unsafeMessage;
    }

    const locationError = getListingLocationValidationMessage(sanitizeInput(formData.region));
    if (locationError) newErrors.region = locationError;
    if (!newErrors.region && fieldValidators.region) {
      const result = fieldValidators.region.validate(sanitizeInput(formData.region));
      if (!result.isValid) newErrors.region = result.message ?? unsafeMessage;
    }

    // Validate stock
    if (formData.stock === '' || formData.stock === undefined) {
      newErrors.stock = t('sell.validation.stockRequired');
    } else {
      const quantity = typeof formData.stock === 'string'
        ? parseInt(formData.stock, 10)
        : formData.stock;

      if (isNaN(quantity)) {
        newErrors.stock = t('sell.validation.stockInteger');
      } else if (!Number.isInteger(quantity)) {
        newErrors.stock = t('sell.validation.stockInteger');
      } else if (quantity < 1) {
        newErrors.stock = t('sell.validation.stockMin');
      }
    }

    if (formData.imageUrls && formData.imageUrls.length === 0) {
      newErrors.imageUrls = t('sell.validation.imageRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'priceAmount' || name === 'stock' 
        ? (value === '' ? '' : parseFloat(value))
        : value
    }));

    const validator = fieldValidators[name as keyof ProductFormData];
    if (validator) {
      const inputValue = name === 'title' || name === 'description' || name === 'region'
        ? sanitizeInput(value)
        : value;
      const result = validator.validate(inputValue);
      if (result.isValid) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      } else {
        setErrors(prev => ({
          ...prev,
          [name]: result.message ?? t('sell.validation.unsafeContent')
        }));
      }
      return;
    }

    setErrors(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError('');

    try {
      // Convert form data to API format
      const submitData: ProductCreate = {
        title: formData.title,
        description: formData.description,
        priceAmount: typeof formData.priceAmount === 'string' ? parseFloat(formData.priceAmount) : formData.priceAmount,
        priceCurrency: formData.priceCurrency || 'SYP',
        imageUrls: formData.imageUrls || [],
        categoryPath: formData.categoryPath,
        condition: formData.condition,
        region: formData.region,
        stock: typeof formData.stock === 'string' 
          ? (formData.stock === '' ? 1 : parseInt(formData.stock, 10))
          : formData.stock || 1
      };

      const response = await createListing(submitData);
      if (isAuthenticated) {
        try {
          const refreshedUser = await getCurrentUser();
          setUser(refreshedUser);
        } catch (refreshError) {
          console.error('Error refreshing profile stats:', refreshError);
        }
      }
      // Redirect to the created listing
      router.push(`/listing/${response.id}`);
    } catch (error: unknown) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title={t('sell.title')}>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold mb-8">{t('sell.heading')}</h1>

            {apiError && (
              <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <span className="block sm:inline">{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  {t('sell.fields.title')}
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full input ${errors.title ? 'border-2 border-red-500' : ''}`}
                  placeholder={t('sell.fields.titlePlaceholder')}
                />
                {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  {t('sell.fields.description')}
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isLoading}
                  rows={6}
                  className={`w-full input ${errors.description ? 'border-2 border-red-500' : ''}`}
                  placeholder={t('sell.fields.descriptionPlaceholder')}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                )}
              </div>

              {/* Images */}
              <div>
                <ImageUpload
                  images={formData.imageUrls || []}
                  onChange={(images) => setFormData(prev => ({ ...prev, imageUrls: images }))}
                />
                {errors.imageUrls && <p className="mt-1 text-sm text-red-500">{errors.imageUrls}</p>}
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="priceAmount" className="block text-sm font-medium mb-2">
                    {t('sell.fields.price')}
                  </label>
                  <input
                    type="number"
                    id="priceAmount"
                    name="priceAmount"
                    value={formData.priceAmount}
                    onChange={handleChange}
                    disabled={isLoading}
                    min="0"
                    step="1000"
                    className={`w-full input ${errors.priceAmount ? 'border-2 border-red-500' : ''}`}
                    placeholder={t('sell.fields.pricePlaceholder')}
                  />
                  {errors.priceAmount && <p className="mt-1 text-sm text-red-500">{errors.priceAmount}</p>}
                </div>

                <div>
                  <label htmlFor="stock" className="block text-sm font-medium mb-2">
                    {t('sell.fields.stock')}
                  </label>
                  <input
                    type="number"
                    id="stock"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    disabled={isLoading}
                    min="1"
                    step="1"
                    className={`w-full input ${errors.stock ? 'border-2 border-red-500' : ''}`}
                    placeholder={t('sell.fields.stockPlaceholder')}
                  />
                  {errors.stock && (
                    <p className="mt-1 text-sm text-red-500">{errors.stock}</p>
                  )}
                </div>
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="categoryPath" className="block text-sm font-medium mb-2">
                    {t('sell.fields.category')}
                  </label>
                  <select
                    id="categoryPath"
                    name="categoryPath"
                    value={formData.categoryPath}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full input ${errors.categoryPath ? 'border-2 border-red-500' : ''}`}
                  >
                    <option value="">{t('sell.fields.categoryPlaceholder')}</option>
                    {SELL_CATEGORIES.map(cat => (
                      <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                  {errors.categoryPath && (
                    <p className="mt-1 text-sm text-red-500">{errors.categoryPath}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="condition" className="block text-sm font-medium mb-2">
                    {t('sell.fields.condition')}
                  </label>
                  <select
                    id="condition"
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full input"
                  >
                    {FILTER_CONDITIONS.map(cond => (
                      <option key={cond.value} value={cond.value}>{t(cond.i18nKey)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="region" className="block text-sm font-medium mb-2">
                  {t('sell.fields.location')}
                </label>
                <input
                  type="text"
                  id="region"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full input ${errors.region ? 'border-2 border-red-500' : ''}`}
                  placeholder={t('sell.fields.locationPlaceholder')}
                />
                {errors.region && (
                  <p className="mt-1 text-sm text-red-500">{errors.region}</p>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex-1 btn btn-primary ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? t('sell.submitting') : t('sell.submit')}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="btn btn-outline"
                >
                  {t('sell.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}
