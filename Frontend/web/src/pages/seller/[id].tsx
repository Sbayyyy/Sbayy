import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import RatingStars from '@/components/RatingStars';
import ReviewList from '@/components/ReviewList';
import { getSellerReviews } from '@/lib/api/reviews';
import { getAllListings } from '@/lib/api/listings';
import { 
  User as UserIcon,
  MapPin,
  Package,
  Star,
  Calendar,
  MessageSquare,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react';
import type { Review, Product } from '@sbay/shared';
import ProductCard from '@/components/ProductCard';

interface SellerProfile {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  region?: string;
  memberSince: string;
  responseTime?: string;
  completionRate?: number;
  totalSales?: number;
  verified: boolean;
}

export default function SellerProfilePage() {
  const router = useRouter();
  const { id: sellerId } = router.query;

  const [seller, setSeller] = useState<SellerProfile | null>(null);
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

      // TODO: Get seller info from backend
      // For now using mock data
      setSeller({
        id: sellerId as string,
        name: `البائع ${(sellerId as string).substring(0, 8)}`,
        rating: 4.5,
        reviewCount: 128,
        region: 'دمشق',
        memberSince: '2024-01-15',
        responseTime: '2 ساعة',
        completionRate: 95,
        totalSales: 342,
        verified: true
      });

      // Load seller's products
      const productsData = await getAllListings(1, 20);
      setProducts(productsData.items.slice(0, 8)); // Limit to 8 for demo

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
                  {seller.verified && (
                    <CheckCircle className="w-6 h-6 text-green-500" fill="currentColor" />
                  )}
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <RatingStars rating={seller.rating} size="md" showNumber />
                    <span className="text-sm text-gray-600">
                      ({seller.reviewCount} تقييم)
                    </span>
                  </div>
                  {seller.region && (
                    <>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{seller.region}</span>
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
                    <p className="font-bold text-gray-900">{formatDate(seller.memberSince)}</p>
                  </div>

                  {seller.totalSales && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Package className="w-4 h-4" />
                        <span className="text-xs">إجمالي المبيعات</span>
                      </div>
                      <p className="font-bold text-gray-900">{seller.totalSales}</p>
                    </div>
                  )}

                  {seller.responseTime && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">وقت الاستجابة</span>
                      </div>
                      <p className="font-bold text-gray-900">{seller.responseTime}</p>
                    </div>
                  )}

                  {seller.completionRate && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs">معدل الإنجاز</span>
                      </div>
                      <p className="font-bold text-gray-900">{seller.completionRate}%</p>
                    </div>
                  )}
                </div>

                {/* Contact Button */}
                <button className="btn-primary flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  تواصل مع البائع
                </button>
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
