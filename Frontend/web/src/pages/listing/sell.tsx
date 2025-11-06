import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/Layout';
import {
  getListingTitleValidationMessage,
  getListingDescriptionValidationMessage,
  getListingPriceValidationMessage,
  getListingCategoryValidationMessage,
  getListingLocationValidationMessage,
  sanitizeInput
} from '@sbay/shared';
import type { ProductCreate } from '@sbay/shared';
import { createListing } from '../../lib/api/listings';
import { useAuthStore } from '../../lib/store';
import ImageUpload from '../../components/imageUpload';

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
  const { isAuthenticated } = useAuthStore();
  
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

  const [errors, setErrors] = useState<Partial<Record<keyof ProductCreate, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Later uncomment to enable authentication check
  // Redirect if not authenticated
  /*
  if (typeof window !== 'undefined' && !isAuthenticated) {
    router.push('/login?redirect=/sell');
    return null;
  }
    */

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductCreate, string>> = {};

    const titleError = getListingTitleValidationMessage(sanitizeInput(formData.title));
    if (titleError) newErrors.title = titleError;

    const descError = getListingDescriptionValidationMessage(sanitizeInput(formData.description));
    if (descError) newErrors.description = descError;

    const priceError = getListingPriceValidationMessage(
      formData.priceAmount === '' ? NaN : formData.priceAmount
    );
    if (priceError) newErrors.priceAmount = priceError as any;

    const categoryError = getListingCategoryValidationMessage(formData.categoryPath);
    if (categoryError) newErrors.categoryPath = categoryError as any;

    const locationError = getListingLocationValidationMessage(sanitizeInput(formData.region));
    if (locationError) newErrors.region = locationError as any;

    // Validate stock
    if (formData.stock === '' || formData.stock === undefined) {
      newErrors.stock = 'الكمية مطلوبة' as any;
    } else {
      const quantity = typeof formData.stock === 'string' 
        ? parseInt(formData.stock, 10) 
        : formData.stock;
      
      if (isNaN(quantity)) {
        newErrors.stock = 'الكمية يجب أن تكون رقماً صحيحاً' as any;
      } else if (!Number.isInteger(quantity)) {
        newErrors.stock = 'الكمية يجب أن تكون رقماً صحيحاً' as any;
      } else if (quantity < 1) {
        newErrors.stock = 'الكمية يجب أن تكون 1 على الأقل' as any;
      }
    }

    if (formData.imageUrls && formData.imageUrls.length === 0) {
      newErrors.imageUrls = 'يجب إضافة صورة واحدة على الأقل' as any;
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

    // Clear error when user starts typing
    setErrors(prev => ({
      ...prev,
      [name]: undefined
    }));
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
      // Redirect to the created listing
      router.push(`/listing/${response.id}`);
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'حدث خطأ أثناء نشر المنتج');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>بيع منتج - سباي</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold mb-8">بيع منتج جديد</h1>

            {apiError && (
              <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <span className="block sm:inline">{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
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
                  disabled={isLoading}
                  className={`w-full input ${errors.title ? 'border-2 border-red-500' : ''}`}
                  placeholder="مثال: هاتف iPhone 15 Pro Max 256GB"
                />
                {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  وصف المنتج *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isLoading}
                  rows={6}
                  className={`w-full input ${errors.description ? 'border-2 border-red-500' : ''}`}
                  placeholder="اكتب وصفاً تفصيلياً للمنتج..."
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
                    السعر (ل.س) *
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
                    placeholder="100000"
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
                    disabled={isLoading}
                    min="1"
                    step="1"
                    className={`w-full input ${errors.stock ? 'border-2 border-red-500' : ''}`}
                    placeholder="1"
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
                    الفئة *
                  </label>
                  <select
                    id="categoryPath"
                    name="categoryPath"
                    value={formData.categoryPath}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full input ${errors.categoryPath ? 'border-2 border-red-500' : ''}`}
                  >
                    <option value="">اختر الفئة</option>
                    <option value="electronics">إلكترونيات</option>
                    <option value="fashion">أزياء</option>
                    <option value="home">منزل وحديقة</option>
                    <option value="cars">سيارات</option>
                    <option value="real-estate">عقارات</option>
                    <option value="other">أخرى</option>
                  </select>
                  {errors.categoryPath && (
                    <p className="mt-1 text-sm text-red-500">{errors.categoryPath}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="condition" className="block text-sm font-medium mb-2">
                    حالة المنتج *
                  </label>
                  <select
                    id="condition"
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full input"
                  >
                    <option value="New">جديد</option>
                    <option value="Used">مستعمل</option>
                    <option value="Refurbished">مجدد</option>
                    <option value="LikeNew">كالجديد</option>
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
                  disabled={isLoading}
                  className={`w-full input ${errors.region ? 'border-2 border-red-500' : ''}`}
                  placeholder="مثال: دمشق - المزة"
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
                  {isLoading ? 'جارٍ النشر...' : 'نشر المنتج'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="btn btn-outline"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
