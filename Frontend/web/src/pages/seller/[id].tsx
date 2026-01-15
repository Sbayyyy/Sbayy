import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import RatingStars from '@/components/RatingStars';
import ReviewList from '@/components/ReviewList';
import { getSellerReviews } from '@/lib/api/reviews';
import { getListingsBySeller } from '@/lib/api/listings';
import { getSellerProfile } from '@/lib/api/users';
import { toast } from '@/lib/toast';
import { 
  User as UserIcon,
  MapPin,
  Package,
  Star,
  Calendar,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import type { Review, Product } from '@sbay/shared';
import ProductCard from '@/components/ProductCard';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function SellerProfilePage() {
  const router = useRouter();
  const { id: sellerId } = router.query;

  const [seller, setSeller] = useState<Awaited<ReturnType<typeof getSellerProfile>> | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');

  useEffect(() => {
    if (sellerId) {
      loadSellerData();
    }
  }, [sellerId]);

  const loadSellerData = async () => {
    try {
      setLoading(true);

      const profile = await getSellerProfile(sellerId as string);
      setSeller(profile);

      // Load seller's products
      const productsData = await getListingsBySeller(sellerId as string);
      setProducts(productsData);

      // Load seller reviews
      try {
        const reviewsData = await getSellerReviews(sellerId as string, 1, 10);
        setReviews(reviewsData.reviews.map(r => ({
          ...r,
          isOwn: false // TODO: Check against current user
        })));
      } catch (err) {
        console.log('Reviews not available yet:', err);
        setReviews([]);
      }

      setError('');
    } catch (err) {
      console.error('Error loading seller data:', err);
      setError('حدث خطأ في تحميل بيانات البائع');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'long'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !seller) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {error || 'البائع غير موجود'}
            </h2>
            <Link href="/browse" className="btn-primary mt-4">
              تصفح المنتجات
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{seller.name} - ملف البائع | Sbay سباي</title>
        <meta name="description" content={`ملف البائع ${seller.name} - التقييم ${seller.rating} من ${seller.reviewCount} تقييم`} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Seller Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {seller.avatar ? (
                  <img
                    src={seller.avatar}
                    alt={seller.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="w-12 h-12 text-gray-500" />
                  </div>
                )}
              </div>

              {/* Seller Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{seller.name}</h1>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <RatingStars rating={seller.rating} size="md" showNumber />
                    <span className="text-sm text-gray-600">
                      ({seller.reviewCount} تقييم)
                    </span>
                  </div>
                  {seller.city && (
                    <>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{seller.city}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">عضو منذ</span>
                    </div>
                    <p className="font-bold text-gray-900">{formatDate(seller.createdAt)}</p>
                  </div>

                  {seller.totalOrders > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Package className="w-4 h-4" />
                        <span className="text-xs">إجمالي المبيعات</span>
                      </div>
                      <p className="font-bold text-gray-900">{seller.totalOrders}</p>
                    </div>
                  )}
                </div>

                {/* Contact Button */}
                <div className="flex flex-wrap gap-3">
                  <button className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 transition-colors">
                    <MessageSquare className="w-5 h-5" />
                    تواصل مع البائع
                  </button>
                  <button
                    onClick={() => toast.info('سيتم إضافة ميزة الإبلاغ قريبًا')}
                    className="flex items-center gap-2 border border-red-300 text-red-700 px-5 py-2.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <AlertCircle className="w-5 h-5" />
                    الإبلاغ عن البائع
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeTab === 'products'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  المنتجات ({products.length})
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeTab === 'reviews'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  التقييمات ({reviews.length})
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'products' ? (
                products.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">لا توجد منتجات معروضة حالياً</p>
                  </div>
                )
              ) : (
                <ReviewList
                  reviews={reviews}
                  loading={false}
                />
              )}
            </div>
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
