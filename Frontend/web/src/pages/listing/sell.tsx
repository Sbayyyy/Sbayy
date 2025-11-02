import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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
  price: number | string;
  currency?: string;
  images?: string[];
  category: string;
  condition: 'new' | 'used' | 'refurbished';
  location: string;
  stockQuantity?: number | string;
}

export default function SellPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    price: '',
    currency: 'SYP',
    images: [],
    category: '',
    condition: 'new',
    location: '',
    stockQuantity: ''
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
      formData.price === '' ? NaN : formData.price
    );
    if (priceError) newErrors.price = priceError;

    const categoryError = getListingCategoryValidationMessage(formData.category);
    if (categoryError) newErrors.category = categoryError;

    const locationError = getListingLocationValidationMessage(sanitizeInput(formData.location));
    if (locationError) newErrors.location = locationError;

    // Validate stockQuantity
    if (formData.stockQuantity === '' || formData.stockQuantity === undefined) {
      newErrors.stockQuantity = 'الكمية مطلوبة';
    } else {
      const quantity = typeof formData.stockQuantity === 'string' 
        ? parseInt(formData.stockQuantity, 10) 
        : formData.stockQuantity;
      
      if (isNaN(quantity)) {
        newErrors.stockQuantity = 'الكمية يجب أن تكون رقماً صحيحاً';
      } else if (!Number.isInteger(quantity)) {
        newErrors.stockQuantity = 'الكمية يجب أن تكون رقماً صحيحاً';
      } else if (quantity < 1) {
        newErrors.stockQuantity = 'الكمية يجب أن تكون 1 على الأقل';
      }
    }

    if (formData.images && formData.images.length === 0) {
      newErrors.images = 'يجب إضافة صورة واحدة على الأقل';
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
      [name]: name === 'price' || name === 'stockQuantity' 
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
        ...formData,
        price: typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price,
        stockQuantity: typeof formData.stockQuantity === 'string' 
          ? (formData.stockQuantity === '' ? 1 : parseFloat(formData.stockQuantity))
          : formData.stockQuantity
      };

      const response = await createListing(submitData);
      if (response.success) {
        // Redirect to the created listing
        router.push(`/listing/${response.data.id}`);
      }
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
                  images={formData.images || []}
                  onChange={(images) => setFormData(prev => ({ ...prev, images }))}
                />
                {errors.images && <p className="mt-1 text-sm text-red-500">{errors.images}</p>}
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium mb-2">
                    السعر (ل.س) *
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    disabled={isLoading}
                    min="0"
                    step="1000"
                    className={`w-full input ${errors.price ? 'border-2 border-red-500' : ''}`}
                    placeholder="100000"
                  />
                  {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
                </div>

                <div>
                  <label htmlFor="stockQuantity" className="block text-sm font-medium mb-2">
                    الكمية المتوفرة *
                  </label>
                  <input
                    type="number"
                    id="stockQuantity"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleChange}
                    disabled={isLoading}
                    min="1"
                    step="1"
                    className={`w-full input ${errors.stockQuantity ? 'border-2 border-red-500' : ''}`}
                    placeholder="1"
                  />
                  {errors.stockQuantity && (
                    <p className="mt-1 text-sm text-red-500">{errors.stockQuantity}</p>
                  )}
                </div>
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium mb-2">
                    الفئة *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`w-full input ${errors.category ? 'border-2 border-red-500' : ''}`}
                  >
                    <option value="">اختر الفئة</option>
                    <option value="electronics">إلكترونيات</option>
                    <option value="fashion">أزياء</option>
                    <option value="home">منزل وحديقة</option>
                    <option value="cars">سيارات</option>
                    <option value="real-estate">عقارات</option>
                    <option value="other">أخرى</option>
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-500">{errors.category}</p>
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
                    <option value="new">جديد</option>
                    <option value="used">مستعمل</option>
                    <option value="refurbished">مجدد</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium mb-2">
                  الموقع *
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full input ${errors.location ? 'border-2 border-red-500' : ''}`}
                  placeholder="مثال: دمشق - المزة"
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-red-500">{errors.location}</p>
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
