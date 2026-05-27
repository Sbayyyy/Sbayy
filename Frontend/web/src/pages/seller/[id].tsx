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
import { useAuthStore } from '@/lib/store';
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
import { useTranslation } from 'next-i18next';
import ReportDialog from '@/components/ReportDialog';
import { getCityI18nKeyFromValue, getCityLabel } from '@/lib/constants';

export default function SellerProfilePage() {
  const router = useRouter();
  const { id: sellerId } = router.query;
  const { t, i18n } = useTranslation('common');
  const { user } = useAuthStore();

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
          isOwn: r.userId === user?.id
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
      setError(t('sellerProfile.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SY' : 'en-US', {
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
        <div className="app-page flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <span>{t('sellerProfile.loading')}</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (!seller) {
    return (
      <Layout>
        <div className="app-page flex items-center justify-center">
          <div className="info-panel text-center text-slate-600">{t('sellerProfile.notFound')}</div>
        </div>
      </Layout>
    );
  }

  const sellerCityI18nKey = getCityI18nKeyFromValue(seller.city);
  const sellerCityLabel = seller.city
    ? sellerCityI18nKey
      ? t(sellerCityI18nKey, getCityLabel(seller.city, i18n.language))
      : getCityLabel(seller.city, i18n.language)
    : '';

  return (
    <Layout>
      <Head>
        <title>{t('sellerProfile.title', { name: seller.name })}</title>
        <meta
          name="description"
          content={t('sellerProfile.description', { name: seller.name, rating: averageRating.toFixed(1) })}
        />
      </Head>

      <div className="app-page">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="surface-card mb-6 p-6">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="flex-shrink-0">
                {seller.avatar ? (
                  <img
                    src={seller.avatar}
                    alt={seller.name}
                    className="h-28 w-28 rounded-full object-cover ring-4 ring-white"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 ring-4 ring-white">
                    <UserIcon className="h-12 w-12 text-slate-400" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h1 className="section-heading">{seller.name}</h1>
                    <div className="mt-2 flex items-center gap-2">
                      <RatingStars rating={averageRating} size="md" showNumber />
                      <span className="text-sm text-slate-600">
                        {averageRating.toFixed(1)} | {t('sellerProfile.reviews', { count: reviewTotal })}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{t('sellerProfile.joined', { date: formatDate(seller.createdAt) })}</span>
                      </div>
                      {sellerCityLabel && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{sellerCityLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">

                  <button
                    onClick={() => setReportOpen(true)}
                    className="btn border border-red-200 bg-white text-red-700 hover:bg-red-50"
                  >
                    <AlertCircle className="h-5 w-5" />
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
            />
          ) : null}

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="surface-card p-5">
              <div className="mb-1 flex items-center gap-2 text-slate-600">
                <Package className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">{t('sellerProfile.itemsSold')}</span>
              </div>
              <p className="text-2xl font-bold text-slate-950">{seller.totalOrders}</p>
              <p className="mt-1 text-xs text-slate-500">{t('sellerProfile.completedSales')}</p>
            </div>
            <div className="surface-card p-5">
              <div className="mb-1 flex items-center gap-2 text-slate-600">
                <Star className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">{t('sellerProfile.averageRating')}</span>
              </div>
              <p className="text-2xl font-bold text-slate-950">{averageRating.toFixed(1)}</p>
              <p className="mt-1 text-xs text-slate-500">{t('sellerProfile.totalReviews', { count: reviewTotal })}</p>
            </div>
            <div className="surface-card p-5">
              <div className="mb-1 flex items-center gap-2 text-slate-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">{t('sellerProfile.positiveFeedback')}</span>
              </div>
              <p className="text-2xl font-bold text-slate-950">
                {hasReviewStats ? `${positiveFeedback}%` : t('sellerProfile.noStats')}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t('sellerProfile.basedOnReviews')}</p>
            </div>
          </div>

          <div className="surface-card mb-6 overflow-hidden">
            <div className="border-b border-slate-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeTab === 'products'
                      ? 'border-b-2 border-primary-600 text-primary-700'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {t('sellerProfile.tabListings', { count: products.length })}
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeTab === 'reviews'
                      ? 'border-b-2 border-primary-600 text-primary-700'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {t('sellerProfile.tabReviews', { count: reviewTotal })}
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
                    <Package className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                    <p className="text-slate-500">{t('sellerProfile.noListings')}</p>
                  </div>
                )
              ) : (
                <div className="space-y-8">
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-6">
                    {hasReviewStats ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="text-center">
                          <div className="mb-2 text-4xl font-bold text-slate-950">
                            {averageRating.toFixed(1)}
                          </div>
                          <RatingStars rating={averageRating} size="md" showNumber={false} />
                          <p className="mt-2 text-sm text-slate-600">
                            {t('sellerProfile.totalRatings', { count: reviewTotal })}
                          </p>
                        </div>
                        <div className="space-y-3">
                          {[5, 4, 3, 2, 1].map((stars) => (
                            <div key={stars} className="flex items-center gap-3">
                              <span className="text-sm w-12">{t('sellerProfile.star', { count: stars })}</span>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full bg-primary-600"
                                  style={{ width: `${getDistributionPercent(stars as 1 | 2 | 3 | 4 | 5)}%` }}
                                />
                              </div>
                              <span className="w-12 text-right text-sm text-slate-600">
                                {getDistributionPercent(stars as 1 | 2 | 3 | 4 | 5)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-slate-500">{t('sellerProfile.noStats')}</div>
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
