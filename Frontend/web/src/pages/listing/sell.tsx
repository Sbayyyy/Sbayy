import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Check, Loader2, Sparkles } from 'lucide-react';
import Layout from '@/components/Layout';
import {
  createOptionalTextInputValidator,
  IValidator,
  loadProfanityListFromUrl,
  sanitizeInput
} from '@sbay/shared';
import type { ProductCreate } from '@sbay/shared';
import { createListing } from '../../lib/api/listings';
import { createBoostPayment, getBoostOptions, type BoostOption } from '@/lib/api/monetization';
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
  const [boostOptions, setBoostOptions] = useState<BoostOption[]>([]);
  const [selectedBoostOption, setSelectedBoostOption] = useState('none');

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

  useEffect(() => {
    getBoostOptions()
      .then(setBoostOptions)
      .catch(() => setBoostOptions([]));
  }, []);

  const formatBoostPrice = (option: BoostOption) =>
    new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SY' : 'en-US', {
      style: 'currency',
      currency: option.currency,
      maximumFractionDigits: option.currency === 'SYP' ? 0 : 2
    }).format(option.price);

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
      const returnUrl =
        typeof window === 'undefined'
          ? undefined
          : `${window.location.origin}/listing/${response.id}`;

      if (selectedBoostOption !== 'none') {
        const payment = await createBoostPayment(response.id, selectedBoostOption, returnUrl);

        if (payment.checkoutUrl) {
          window.location.href = payment.checkoutUrl;
          return;
        }
      }

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

              <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">
                      {t('sell.boost.kicker', 'Optional boost')}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-950">
                      {t('sell.boost.title', 'Make this listing stand out')}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {t('sell.boost.description', 'Basic listings are free. A boost is paid separately and activates only after payment confirmation.')}
                    </p>
                  </div>
                  <Sparkles className="mt-1 h-5 w-5 flex-shrink-0 text-amber-500" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => setSelectedBoostOption('none')}
                    disabled={isLoading}
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedBoostOption === 'none'
                        ? 'border-primary-600 bg-white shadow-sm ring-2 ring-primary-100'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {t('sell.boost.freeTitle', 'Free listing')}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {t('sell.boost.freeDescription', 'Standard feed placement')}
                        </p>
                      </div>
                      {selectedBoostOption === 'none' ? (
                        <span className="rounded-full bg-primary-600 p-1 text-white">
                          <Check size={14} />
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-4 text-lg font-bold text-slate-950">
                      {t('sell.boost.freePrice', 'Free')}
                    </p>
                  </button>

                  {boostOptions.map(option => {
                    const isSelected = selectedBoostOption === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedBoostOption(option.id)}
                        disabled={isLoading}
                        className={`rounded-xl border p-4 text-left transition ${
                          isSelected
                            ? 'border-primary-600 bg-white shadow-sm ring-2 ring-primary-100'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-950">
                              {option.durationDays} {t('sell.boost.days', 'days')}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {option.name}
                            </p>
                          </div>
                          {isSelected ? (
                            <span className="rounded-full bg-primary-600 p-1 text-white">
                              <Check size={14} />
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-4 text-lg font-bold text-slate-950">
                          {formatBoostPrice(option)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex-1 btn btn-primary ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('sell.submitting')}
                    </span>
                  ) : selectedBoostOption === 'none' ? (
                    t('sell.submit')
                  ) : (
                    t('sell.boost.submit', 'Create listing and continue to payment')
                  )}
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
