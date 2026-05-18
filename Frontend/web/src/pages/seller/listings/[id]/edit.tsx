import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ImageUpload from '@/components/imageUpload';
import { getListingById, updateListing } from '@/lib/api/listings';
import { Product, ProductUpdate } from '@sbay/shared';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { getErrorMessage } from '@/lib/api/errors';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Select } from '@/components/ui/select';
import { CITIES, normalizeCityValue } from '@/lib/constants';

interface ProductFormData {
  title: string;
  description: string;
  priceAmount: string;
  priceCurrency: string;
  imageUrls: string[];
  categoryPath: string;
  stock: string;
  condition: string;
  region: string;
  specificLocation: string;
}

export default function EditListingPage() {
  const router = useRouter();
  const { id } = router.query;
  const isAuthed = useRequireAuth();
  const { t } = useTranslation('common');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [listing, setListing] = useState<Product | null>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    priceAmount: '',
    priceCurrency: 'SYP',
    imageUrls: [],
    categoryPath: '',
    stock: '',
    condition: 'New',
    region: '',
    specificLocation: ''
  });

  const [errors, setErrors] = useState<Partial<ProductFormData>>({});

  useEffect(() => {
    if (!isAuthed) return;
    if (id && typeof id === 'string') {
      loadListing(id);
    }
  }, [id, isAuthed]);

  const loadListing = async (listingId: string) => {
    try {
      setLoading(true);
      const data = await getListingById(listingId);
      setListing(data);

      setFormData({
        title: data.title,
        description: data.description,
        priceAmount: data.priceAmount.toString(),
        priceCurrency: data.priceCurrency,
        imageUrls: data.imageUrls || [],
        categoryPath: data.categoryPath || '',
        stock: data.stock.toString(),
        condition: data.condition,
        region: normalizeCityValue(data.region || ''),
        specificLocation: data.specificLocation || ''
      });
    } catch (err: unknown) {
      console.error('Error loading listing:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof ProductFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleImagesChange = (urls: string[]) => {
    setFormData(prev => ({ ...prev, imageUrls: urls }));
    if (errors.imageUrls) {
      setErrors(prev => ({ ...prev, imageUrls: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<ProductFormData> = {};

    if (!formData.title.trim()) newErrors.title = t('editListing.validation.titleRequired');
    if (!formData.description.trim()) newErrors.description = t('editListing.validation.descriptionRequired');
    if (!formData.priceAmount || parseFloat(formData.priceAmount) <= 0) {
      newErrors.priceAmount = t('editListing.validation.pricePositive');
    }
    if (!formData.region.trim()) newErrors.region = t('editListing.validation.locationRequired');
    if (!formData.stock || parseInt(formData.stock) < 0) {
      newErrors.stock = t('editListing.validation.stockMin');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !id) return;

    try {
      setSubmitting(true);
      setError('');

      const updateData: ProductUpdate = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priceAmount: parseFloat(formData.priceAmount),
        priceCurrency: formData.priceCurrency,
        imageUrls: formData.imageUrls,
        categoryPath: formData.categoryPath.trim() || undefined,
        stock: parseInt(formData.stock),
        condition: formData.condition,
        region: normalizeCityValue(formData.region.trim()),
        specificLocation: formData.specificLocation.trim()
      };

      await updateListing(id as string, updateData);

      router.push('/seller/my-listings');
    } catch (err: unknown) {
      console.error('Update error:', err);
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title={t('editListing.title')}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('editListing.loading')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !listing) {
    return (
      <Layout title={t('editListing.title')}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/seller/my-listings')}
              className="btn btn-primary"
            >
              {t('editListing.backToListings')}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('editListing.titleWithName', { name: listing?.title || '' })}>
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/seller/my-listings')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft size={20} />
              {t('editListing.backToListings')}
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{t('editListing.heading')}</h1>
            <p className="text-gray-600 mt-2">{t('editListing.subtitle')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  {t('editListing.fields.title')}
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={submitting}
                  className={`w-full input ${errors.title ? 'border-2 border-red-500' : ''}`}
                  placeholder={t('editListing.fields.titlePlaceholder')}
                />
                {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  {t('editListing.fields.description')}
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={submitting}
                  rows={6}
                  className={`w-full input ${errors.description ? 'border-2 border-red-500' : ''}`}
                  placeholder={t('editListing.fields.descriptionPlaceholder')}
                />
                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('editListing.fields.images')}
                </label>
                <ImageUpload
                  images={formData.imageUrls}
                  onChange={handleImagesChange}
                  maxImages={5}
                />
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="priceAmount" className="block text-sm font-medium mb-2">
                    {t('editListing.fields.price')}
                  </label>
                  <input
                    type="number"
                    id="priceAmount"
                    name="priceAmount"
                    value={formData.priceAmount}
                    onChange={handleChange}
                    disabled={submitting}
                    min="0"
                    step="1"
                    className={`w-full input ${errors.priceAmount ? 'border-2 border-red-500' : ''}`}
                  />
                  {errors.priceAmount && <p className="mt-1 text-sm text-red-500">{errors.priceAmount}</p>}
                </div>

                <div>
                  <label htmlFor="stock" className="block text-sm font-medium mb-2">
                    {t('editListing.fields.stock')}
                  </label>
                  <input
                    type="number"
                    id="stock"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    disabled={submitting}
                    min="0"
                    className={`w-full input ${errors.stock ? 'border-2 border-red-500' : ''}`}
                  />
                  {errors.stock && <p className="mt-1 text-sm text-red-500">{errors.stock}</p>}
                </div>
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="categoryPath" className="block text-sm font-medium mb-2">
                    {t('editListing.fields.category')}
                  </label>
                  <Select
                    id="categoryPath"
                    name="categoryPath"
                    value={formData.categoryPath}
                    onChange={handleChange}
                    disabled={submitting}
                  >
                    <option value="">{t('editListing.fields.categoryPlaceholder')}</option>
                    <option value="electronics">{t('editListing.categories.electronics')}</option>
                    <option value="fashion">{t('editListing.categories.fashion')}</option>
                    <option value="home">{t('editListing.categories.home')}</option>
                    <option value="cars">{t('editListing.categories.cars')}</option>
                    <option value="real-estate">{t('editListing.categories.realEstate')}</option>
                    <option value="other">{t('editListing.categories.other')}</option>
                  </Select>
                </div>

                <div>
                  <label htmlFor="condition" className="block text-sm font-medium mb-2">
                    {t('editListing.fields.condition')}
                  </label>
                  <Select
                    id="condition"
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                    disabled={submitting}
                  >
                    <option value="New">{t('editListing.conditions.new')}</option>
                    <option value="Used">{t('editListing.conditions.used')}</option>
                    <option value="Refurbished">{t('editListing.conditions.refurbished')}</option>
                    <option value="LikeNew">{t('editListing.conditions.likeNew')}</option>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="region" className="block text-sm font-medium mb-2">
                  {t('editListing.fields.region', 'Region *')}
                </label>
                <Select
                  id="region"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  disabled={submitting}
                  className={`w-full input ${errors.region ? 'border-2 border-red-500' : ''}`}
                >
                  <option value="">{t('editListing.fields.regionPlaceholder', 'Select region')}</option>
                  {CITIES.map(city => (
                    <option key={city.value} value={city.value}>{t(city.i18nKey, city.i18nDefault)}</option>
                  ))}
                </Select>
                {errors.region && <p className="mt-1 text-sm text-red-500">{errors.region}</p>}
              </div>

              <div>
                <label htmlFor="specificLocation" className="block text-sm font-medium mb-2">
                  {t('editListing.fields.specificLocation', 'Specific location (optional)')}
                </label>
                <input
                  type="text"
                  id="specificLocation"
                  name="specificLocation"
                  value={formData.specificLocation}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full input"
                  placeholder={t('editListing.fields.specificLocationPlaceholder', 'Neighborhood, street, or landmark')}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline ml-2" />
                      {t('editListing.submitting')}
                    </>
                  ) : (
                    t('editListing.submit')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/seller/my-listings')}
                  disabled={submitting}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('editListing.cancel')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps({ locale }: { locale?: string }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'ar', ['common'])) } };
}
