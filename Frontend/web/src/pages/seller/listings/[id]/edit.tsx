import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ImageUpload from '@/components/imageUpload';
import { getListingById, updateListing } from '@/lib/api/listings';
import { Product, ProductUpdate } from '@sbay/shared';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useRequireAuth } from '@/lib/useRequireAuth';

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
}

export default function EditListingPage() {
  const router = useRouter();
  const { id } = router.query;
  const isAuthed = useRequireAuth();
  
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
    region: ''
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
      
      // Formular mit existierenden Daten befüllen
      setFormData({
        title: data.title,
        description: data.description,
        priceAmount: data.priceAmount.toString(),
        priceCurrency: data.priceCurrency,
        imageUrls: data.imageUrls || [],
        categoryPath: data.categoryPath || '',
        stock: data.stock.toString(),
        condition: data.condition,
        region: data.region || ''
      });
    } catch (err: any) {
      console.error('Error loading listing:', err);
      setError('فشل تحميل المنتج');
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

    if (!formData.title.trim()) newErrors.title = 'العنوان مطلوب';
    if (!formData.description.trim()) newErrors.description = 'الوصف مطلوب';
    if (!formData.priceAmount || parseFloat(formData.priceAmount) <= 0) {
      newErrors.priceAmount = 'السعر يجب أن يكون أكبر من 0';
    }
    if (!formData.region.trim()) newErrors.region = 'الموقع مطلوب';
    if (!formData.stock || parseInt(formData.stock) < 0) {
      newErrors.stock = 'الكمية يجب أن تكون 0 أو أكثر';
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
        region: formData.region.trim()
      };

      await updateListing(id as string, updateData);
      
      // Redirect to My Listings
      router.push('/seller/my-listings');
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.response?.data?.message || 'فشل تحديث المنتج');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="تعديل المنتج - سباي">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">جارٍ التحميل...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !listing) {
    return (
      <Layout title="تعديل المنتج - سباي">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/seller/my-listings')}
              className="btn btn-primary"
            >
              العودة إلى منتجاتي
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`تعديل: ${listing?.title || 'منتج'} - سباي`}>
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/seller/my-listings')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft size={20} />
              العودة إلى منتجاتي
            </button>
            <h1 className="text-3xl font-bold text-gray-900">تعديل المنتج</h1>
            <p className="text-gray-600 mt-2">قم بتحديث معلومات منتجك</p>
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
                  عنوان المنتج *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={submitting}
                  className={`w-full input ${errors.title ? 'border-2 border-red-500' : ''}`}
                  placeholder="مثال: آيفون 15 برو ماكس 256GB"
                />
                {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  الوصف *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={submitting}
                  rows={6}
                  className={`w-full input ${errors.description ? 'border-2 border-red-500' : ''}`}
                  placeholder="اكتب وصفاً تفصيلياً للمنتج..."
                />
                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  صور المنتج
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
                    السعر (ل.س) *
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
                    الكمية المتوفرة *
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
                    الفئة
                  </label>
                  <select
                    id="categoryPath"
                    name="categoryPath"
                    value={formData.categoryPath}
                    onChange={handleChange}
                    disabled={submitting}
                    className="w-full input"
                  >
                    <option value="">اختر الفئة</option>
                    <option value="electronics">إلكترونيات</option>
                    <option value="fashion">أزياء</option>
                    <option value="home">منزل وحديقة</option>
                    <option value="cars">سيارات</option>
                    <option value="real-estate">عقارات</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="condition" className="block text-sm font-medium mb-2">
                    الحالة *
                  </label>
                  <select
                    id="condition"
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                    disabled={submitting}
                    className="w-full input"
                  >
                    <option value="New">جديد</option>
                    <option value="Used">مستعمل</option>
                    <option value="Refurbished">مجدد</option>
                    <option value="LikeNew">مثل الجديد</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="region" className="block text-sm font-medium mb-2">
                  الموقع *
                </label>
                <input
                  type="text"
                  id="region"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  disabled={submitting}
                  className={`w-full input ${errors.region ? 'border-2 border-red-500' : ''}`}
                  placeholder="مثال: دمشق - المزة"
                />
                {errors.region && <p className="mt-1 text-sm text-red-500">{errors.region}</p>}
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
                      جارٍ التحديث...
                    </>
                  ) : (
                    'حفظ التعديلات'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/seller/my-listings')}
                  disabled={submitting}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
