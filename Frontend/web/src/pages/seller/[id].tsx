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
import type { Review, ReviewStats, Product } from '@sbay/shared';
import ProductCard from '@/components/ProductCard';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import ReportDialog from '@/components/ReportDialog';

export default function SellerProfilePage() {
  const router = useRouter();
  const { id: sellerId } = router.query;

  const [seller, setSeller] = useState<Awaited<ReturnType<typeof getSellerProfile>> | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');
  const [reportOpen, setReportOpen] = useState(false);

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
        setReviewStats(reviewsData.stats);
      } catch (err) {
        console.log('Reviews not available yet:', err);
        setReviews([]);
        setReviewStats(null);
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

  const hasReviewStats = !!reviewStats;
  const averageRating = reviewStats?.averageRating ?? seller?.rating ?? 0;
  const reviewTotal = reviewStats?.totalReviews ?? seller?.reviewCount ?? 0;
  const ratingDistribution = reviewStats?.ratingDistribution ?? {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };
  const getDistributionPercent = (stars: 1 | 2 | 3 | 4 | 5) => {
    if (!reviewStats || !reviewTotal) return 0;
    return Math.round((ratingDistribution[stars] / reviewTotal) * 100);
  };
  const positiveFeedback =
    reviewStats && reviewTotal
      ? Math.round(((ratingDistribution[4] + ratingDistribution[5]) / reviewTotal) * 100)
      : 0;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-600">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span>Loading seller profile...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (!seller) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center text-gray-600">Seller not found.</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{seller.name} - Seller Profile | SBay</title>
        <meta
          name="description"
          content={`Seller profile for ${seller.name}. Rated ${averageRating.toFixed(1)} out of 5.`}
        />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                {seller.avatar ? (
                  <img
                    src={seller.avatar}
                    alt={seller.name}
                    className="w-28 h-28 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center">
                    <UserIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{seller.name}</h1>
                    <div className="flex items-center gap-2 mt-2">
                      <RatingStars rating={averageRating} size="md" showNumber />
                      <span className="text-sm text-gray-600">
                        {averageRating.toFixed(1)} | {reviewTotal} reviews
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {formatDate(seller.createdAt)}</span>
                      </div>
                      {seller.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{seller.city}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">

                  <button
                    onClick={() => setReportOpen(true)}
                    className="flex items-center gap-2 border border-red-300 text-red-700 px-5 py-2.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <AlertCircle className="w-5 h-5" />
                    {t('report.actions.report', { defaultValue: 'Report' })}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {seller?.id ? (
            <ReportDialog
              isOpen={reportOpen}
              onClose={() => setReportOpen(false)}
              targetType="UserProfile"
              targetId={seller.id}
              onSubmitted={() => toast.success(t('report.success', { defaultValue: 'Report submitted.' }))}
            />
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">Items Sold</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{seller.totalOrders}</p>
              <p className="text-xs text-gray-500 mt-1">Completed sales</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Star className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">Average Rating</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">{reviewTotal} total reviews</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">Positive Feedback</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {hasReviewStats ? `${positiveFeedback}%` : 'No stats'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Based on reviews</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm mb-6">
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
                  Listings ({products.length})
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeTab === 'reviews'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Reviews ({reviewTotal})
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
                    <p className="text-gray-500">No listings available right now.</p>
                  </div>
                )
              ) : (
                <div className="space-y-8">
                  <div className="bg-gray-50 rounded-xl p-6">
                    {hasReviewStats ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-gray-900 mb-2">
                            {averageRating.toFixed(1)}
                          </div>
                          <RatingStars rating={averageRating} size="md" showNumber={false} />
                          <p className="text-sm text-gray-600 mt-2">
                            {reviewTotal} total ratings
                          </p>
                        </div>
                        <div className="space-y-3">
                          {[5, 4, 3, 2, 1].map((stars) => (
                            <div key={stars} className="flex items-center gap-3">
                              <span className="text-sm w-12">{stars} star</span>
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${getDistributionPercent(stars as 1 | 2 | 3 | 4 | 5)}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 w-12 text-right">
                                {getDistributionPercent(stars as 1 | 2 | 3 | 4 | 5)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-gray-500">No stats available yet.</div>
                    )}
                  </div>

                  <ReviewList reviews={reviews} loading={false} />
                </div>
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
