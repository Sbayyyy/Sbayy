import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import {
  createOptionalTextInputValidator,
  IValidator,
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
import { CITIES, SELL_CATEGORIES, FILTER_CONDITIONS, getCategoryName, normalizeCityValue } from '@/lib/constants';
import { Select } from '@/components/ui/select';

interface ProductFormData {
  title: string;
  description: string;
  priceAmount: number | string;
  priceCurrency?: string;
  imageUrls?: string[];
  categoryPath: string;
  condition: string;
  region: string;
  stock?: number | string;
}

const sanitizeWhileTyping = (value: string): string => value.replace(/[<>]/g, '');
const PRICE_CURRENCIES = ['SYP', 'USD', 'EUR'];

export default function SellPage() {
  const router = useRouter();
  const { isAuthenticated, setUser } = useAuthStore();
  const isAuthed = useRequireAuth();
  const { t, i18n } = useTranslation('common');

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

  const textInputValidator = useMemo(
    () =>
      createOptionalTextInputValidator({
        profanityMessage: t('validation.profanity'),
        sqlInjectionMessage: t('validation.sqlInjection'),
        xssMessage: t('validation.xss')
      }),
    [t]
  );

  const fieldValidators: Partial<Record<keyof ProductFormData, IValidator<string>>> = {
    title: textInputValidator,
    description: textInputValidator,
    categoryPath: textInputValidator,
    region: textInputValidator
  };

  useEffect(() => {
    void loadProfanityListFromUrl('/profanities.txt');
  }, []);

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

  const validateTextField = (
    field: keyof ProductFormData,
    value: string,
    requiredMessage?: string,
    minLength?: number,
    maxLength?: number
  ): string | undefined => {
    const sanitizedValue = sanitizeInput(value);

    if (!sanitizedValue) {
      return requiredMessage;
    }

    if (minLength !== undefined && sanitizedValue.length < minLength) {
      return t('sell.validation.minLength', { count: minLength });
    }

    if (maxLength !== undefined && sanitizedValue.length > maxLength) {
      return t('sell.validation.maxLength', { count: maxLength });
    }

    const validator = fieldValidators[field];

    if (!validator) {
      return undefined;
    }

    const result = validator.validate(sanitizedValue);

    return result.isValid ? undefined : result.message ?? t('sell.validation.unsafeContent');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const titleError = validateTextField(
      'title',
      formData.title,
      t('sell.validation.titleRequired'),
      3,
      100
    );

    if (titleError) {
      newErrors.title = titleError;
    }

    const descriptionError = validateTextField(
      'description',
      formData.description,
      t('sell.validation.descriptionRequired'),
      10,
      2000
    );

    if (descriptionError) {
      newErrors.description = descriptionError;
    }

    const price =
      formData.priceAmount === ''
        ? NaN
        : typeof formData.priceAmount === 'string'
          ? parseFloat(formData.priceAmount)
          : formData.priceAmount;

    if (Number.isNaN(price)) {
      newErrors.priceAmount = t('sell.validation.priceRequired');
    } else if (price < 0) {
      newErrors.priceAmount = t('sell.validation.priceMin');
    }

    if (!formData.categoryPath) {
      newErrors.categoryPath = t('sell.validation.categoryRequired');
    } else {
      const categoryResult = textInputValidator.validate(formData.categoryPath);

      if (!categoryResult.isValid) {
        newErrors.categoryPath = categoryResult.message ?? t('sell.validation.unsafeContent');
      }
    }

    const locationError = validateTextField(
      'region',
      formData.region,
      t('sell.validation.locationRequired'),
      2,
      100
    );

    if (locationError) {
      newErrors.region = locationError;
    }

    if (formData.stock === '' || formData.stock === undefined) {
      newErrors.stock = t('sell.validation.stockRequired');
    } else {
      const quantity =
        typeof formData.stock === 'string'
          ? parseInt(formData.stock, 10)
          : formData.stock;

      if (Number.isNaN(quantity)) {
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

    const nextValue =
      name === 'priceAmount' || name === 'stock'
        ? value
        : sanitizeWhileTyping(value);

    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));

    const validator = fieldValidators[name as keyof ProductFormData];

    if (validator) {
      const result = validator.validate(String(nextValue));

      setErrors(prev => {
        const next = { ...prev };

        if (result.isValid) {
          delete next[name];
        } else {
          next[name] = result.message ?? t('sell.validation.unsafeContent');
        }

        return next;
      });

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
      const submitData: ProductCreate = {
        title: sanitizeInput(formData.title),
        description: sanitizeInput(formData.description),
        priceAmount:
          typeof formData.priceAmount === 'string'
            ? parseFloat(formData.priceAmount)
            : formData.priceAmount,
        priceCurrency: formData.priceCurrency || 'SYP',
        imageUrls: formData.imageUrls || [],
        categoryPath: formData.categoryPath,
        condition: formData.condition,
        region: normalizeCityValue(sanitizeInput(formData.region)),
        stock:
          typeof formData.stock === 'string'
            ? formData.stock === ''
              ? 1
              : parseInt(formData.stock, 10)
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

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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

              <div>
                <ImageUpload
                  images={formData.imageUrls || []}
                  onChange={(images) => setFormData(prev => ({ ...prev, imageUrls: images }))}
                />
                {errors.imageUrls && <p className="mt-1 text-sm text-red-500">{errors.imageUrls}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="priceAmount" className="block text-sm font-medium mb-2">
                    {t('sell.fields.price')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      id="priceAmount"
                      name="priceAmount"
                      value={formData.priceAmount}
                      onChange={handleChange}
                      disabled={isLoading}
                      min="0"
                      step="any"
                      className={`min-w-0 flex-1 input ${errors.priceAmount ? 'border-2 border-red-500' : ''}`}
                      placeholder={t('sell.fields.pricePlaceholder')}
                    />
                    <Select
                      id="priceCurrency"
                      name="priceCurrency"
                      value={formData.priceCurrency || 'SYP'}
                      onChange={handleChange}
                      disabled={isLoading}
                      aria-label={t('sell.fields.currency')}
                      className="w-28 flex-shrink-0"
                    >
                      {PRICE_CURRENCIES.map(currency => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </Select>
                  </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="categoryPath" className="block text-sm font-medium mb-2">
                    {t('sell.fields.category')}
                  </label>
                  <Select
                    id="categoryPath"
                    name="categoryPath"
                    value={formData.categoryPath}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={errors.categoryPath ? '!border-red-500 focus:!border-red-500 focus:!ring-red-100' : ''}
                  >
                    <option value="">{t('sell.fields.categoryPlaceholder')}</option>
                    {SELL_CATEGORIES.map(cat => (
                      <option key={cat.slug} value={cat.slug}>{getCategoryName(cat, i18n.language)}</option>
                    ))}
                  </Select>
                  {errors.categoryPath && (
                    <p className="mt-1 text-sm text-red-500">{errors.categoryPath}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="condition" className="block text-sm font-medium mb-2">
                    {t('sell.fields.condition')}
                  </label>
                  <Select
                    id="condition"
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                    disabled={isLoading}
                  >
                    {FILTER_CONDITIONS.map(cond => (
                      <option key={cond.value} value={cond.value}>{t(cond.i18nKey)}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <label htmlFor="region" className="block text-sm font-medium mb-2">
                  {t('sell.fields.location')}
                </label>
                <Select
                  id="region"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full input ${errors.region ? 'border-2 border-red-500' : ''}`}
                >
                  <option value="">{t('sell.fields.locationPlaceholder')}</option>
                  {CITIES.map(city => (
                    <option key={city.value} value={city.value}>{t(city.i18nKey, city.i18nDefault)}</option>
                  ))}
                </Select>
                {errors.region && (
                  <p className="mt-1 text-sm text-red-500">{errors.region}</p>
                )}
              </div>

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
