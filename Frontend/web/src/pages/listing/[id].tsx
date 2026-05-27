import { useState, useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { Heart, Share2, MapPin } from 'lucide-react';
import { deleteListing } from '@/lib/api/listings';
import { fetchListingByIdSSR } from '@/lib/api/server';
import { addFavorite, getFavorites, removeFavorite } from '@/lib/api/favorites';
import { trackInteraction } from '@/lib/api/recommendations';
import { openChat } from '@/lib/api/messages';
import { requestEmailVerification } from '@/lib/api/auth';
import { Product } from '@sbay/shared';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import ReportDialog from '@/components/ReportDialog';
import { CONDITION_LABEL_MAP, CONDITION_I18N_MAP, getCategoryLabelFromValue, getCityI18nKeyFromValue, getCityLabel } from '@/lib/constants';
import { formatPrice } from '@/lib/formatters';
import { useRequireAuthAction } from '@/lib/hooks/useRequireAuthAction';
import { ImageGallery, SellerCard, ListingActions, TrustBadges } from '@/components/listing';
import Layout from '@/components/Layout';
import {
  buildBreadcrumbList,
  buildListingDescription,
  buildListingTitle,
  buildProductSchema,
  listingPath,
  parseListingId,
  absoluteUrl,
  type SeoLocale,
} from '@/lib/seo';

interface ListingDetailProps {
  initialListing: Product;
  canonicalPath: string;
  categoryLabel: string;
  regionLabel: string;
  locale: SeoLocale;
}

export default function ListingDetail({
  initialListing,
  canonicalPath,
  categoryLabel,
  regionLabel,
  locale,
}: ListingDetailProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation('common');
  const requireAuth = useRequireAuthAction();

  const [listing] = useState<Product>(initialListing);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (listing?.categoryPath) {
      void trackInteraction(listing.categoryPath, 'view');
    }
  }, [listing?.categoryPath]);

  useEffect(() => {
    const loadFavoriteState = async () => {
      if (!isAuthenticated) {
        setIsFavorite(false);
        return;
      }
      try {
        const favorites = await getFavorites();
        setIsFavorite(favorites.some(item => item.id === listing.id));
      } catch (err) {
        console.error('Error loading favorites:', err);
      }
    };
    void loadFavoriteState();
  }, [listing.id, isAuthenticated]);

  const handleContactSeller = () => {
    if (!requireAuth()) return;
    if (contactLoading) return;
    if (user && !user.verified) {
      requestEmailVerification()
        .then(() => toast.success(t('verifyEmail.beforeMessagingEmailSent')))
        .catch((err) => {
          console.error('Error requesting verification email:', err);
          toast.error(t('verifyEmail.beforeMessaging'));
        });
      return;
    }
    const otherUserId = listing.seller?.id || listing.sellerId;
    if (!otherUserId) {
      toast.error(t('listing.actions.openChatError', 'Unable to open chat.'));
      return;
    }
    setContactLoading(true);
    openChat({ otherUserId, listingId: listing.id })
      .then((response) => {
        const chatId = response.chatId ?? response.id;
        router.push(`/messages/${chatId}`);
      })
      .catch((err) => {
        console.error('Error opening chat:', err);
        toast.error(t('listing.actions.openChatError', 'Unable to open chat.'));
      })
      .finally(() => setContactLoading(false));
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: listing.description,
          url: window.location.href,
        });
      } catch {
        // user cancelled
      }
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success(t('listing.share.copied', 'Link copied.'));
    }
  };

  const handleDeleteListing = async () => {
    if (deleteLoading) return;
    if (!requireAuth()) return;
    const confirmed = window.confirm(t('listing.actions.deleteConfirm', 'Are you sure you want to delete this listing?'));
    if (!confirmed) return;

    setDeleteLoading(true);
    try {
      await deleteListing(listing.id);
      toast.success(t('listing.actions.deleteSuccess', 'Listing deleted.'));
      router.push('/');
    } catch (err) {
      console.error('Error deleting listing:', err);
      toast.error(t('listing.actions.deleteError', 'Failed to delete listing.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!requireAuth()) return;
    if (favoriteLoading) return;

    const nextIsFavorite = !isFavorite;
    setIsFavorite(nextIsFavorite);
    setFavoriteLoading(true);
    try {
      if (nextIsFavorite) {
        await addFavorite(listing.id);
        if (listing.categoryPath) {
          void trackInteraction(listing.categoryPath, 'favorite');
        }
        toast.success(t('listing.actions.favoriteAdded', 'Added to favorites.'));
      } else {
        await removeFavorite(listing.id);
        toast.success(t('listing.actions.favoriteRemoved', 'Removed from favorites.'));
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
      setIsFavorite(!nextIsFavorite);
      toast.error(t('listing.actions.favoriteError', 'Failed to update favorites.'));
    } finally {
      setFavoriteLoading(false);
    }
  };

  const conditionLabels: Record<string, string> = Object.fromEntries(
    Object.entries(CONDITION_I18N_MAP).map(([value, i18nKey]) => [
      value,
      t(i18nKey, CONDITION_LABEL_MAP[value] || value),
    ])
  );

  const isAvailable = listing.stock === undefined || listing.stock > 0;
  const sellerProfileId = listing.seller?.id || listing.sellerId;
  const isOwnListing = user?.id === sellerProfileId;
  const locationLabel = [regionLabel, listing.specificLocation].filter(Boolean).join(' - ');

  // ---- SEO ----
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://syrian-bay.com').replace(/\/+$/, '');
  const brandName = locale === 'ar' ? 'سباي' : 'SBay';

  const seoTitle = buildListingTitle({
    title: listing.title,
    description: listing.description,
    priceAmount: listing.priceAmount,
    priceCurrency: listing.priceCurrency,
    categoryLabel,
    regionLabel,
    brandName,
    locale,
  });

  const seoDescription = buildListingDescription({
    title: listing.title,
    description: listing.description,
    priceAmount: listing.priceAmount,
    priceCurrency: listing.priceCurrency,
    categoryLabel,
    regionLabel,
    brandName,
    locale,
  });

  // OG image: prefer the listing thumbnail/first image, fall back to logo.
  const seoImage = listing.thumbnailUrl || listing.imageUrls?.[0] || undefined;

  const browsePath = '/browse';
  const categoryPath = listing.categoryPath ? `/browse?category=${encodeURIComponent(listing.categoryPath)}` : browsePath;

  const breadcrumb = buildBreadcrumbList([
    { name: locale === 'ar' ? 'الرئيسية' : 'Home', url: absoluteUrl(siteUrl, '/') },
    { name: locale === 'ar' ? 'الإعلانات' : 'Listings', url: absoluteUrl(siteUrl, browsePath) },
    ...(categoryLabel
      ? [{ name: categoryLabel, url: absoluteUrl(siteUrl, categoryPath) }]
      : []),
    { name: listing.title, url: absoluteUrl(siteUrl, canonicalPath) },
  ]);

  const productSchema = buildProductSchema({
    siteUrl,
    listing,
    canonicalPath,
    categoryLabel,
    regionLabel,
    locale,
  });

  // Hide sold/inactive listings from search engines.
  const isPubliclyIndexable = listing.status !== 'sold'
    && listing.status !== 'inactive'
    && listing.status !== 'hidden'
    && listing.status !== 'deleted';

  return (
    <>
      <Layout
        seo={{
          title: seoTitle,
          description: seoDescription,
          image: seoImage,
          imageAlt: listing.title,
          type: 'product',
          path: canonicalPath,
          noindex: !isPubliclyIndexable,
          jsonLd: [productSchema, breadcrumb],
        }}
      >
        <div className="app-page py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="mb-5 text-sm">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <li>
                  <button onClick={() => router.push('/')} className="text-slate-500 transition-colors hover:text-slate-900">
                    {t('listing.breadcrumbs.home', 'Home')}
                  </button>
                </li>
                <li aria-hidden="true" className="text-slate-400">/</li>
                <li>
                  <button
                    onClick={() => router.push(categoryPath)}
                    className="text-slate-500 transition-colors hover:text-slate-900"
                  >
                    {categoryLabel || t('listing.breadcrumbs.categoryFallback', 'Listings')}
                  </button>
                </li>
                <li aria-hidden="true" className="text-slate-400">/</li>
                <li className="inline-block max-w-xs truncate text-slate-900">{listing.title}</li>
              </ol>
            </nav>

            <article className="surface-card overflow-hidden">
              <div className="grid grid-cols-1 gap-8 p-4 sm:p-6 lg:grid-cols-2">
                <ImageGallery
                  images={listing.imageUrls || []}
                  title={listing.title}
                  selectedIndex={selectedImageIndex}
                  onSelectIndex={setSelectedImageIndex}
                  prevLabel={t('listing.images.previous', 'Previous image')}
                  nextLabel={t('listing.images.next', 'Next image')}
                />

                <div className="flex flex-col">
                  <div className="flex-1">
                    <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-950">
                      {listing.title}
                    </h1>

                    <div className="mb-6 flex flex-wrap items-center gap-4">
                      <span className="text-3xl font-bold text-primary-700">
                        {formatPrice(listing.priceAmount, locale, listing.priceCurrency || t('listing.details.currencyFallback', 'SYP'))}
                      </span>
                      {listing.condition && (
                        <span className="status-pill border-slate-200 bg-slate-50 text-slate-700">
                          {conditionLabels[listing.condition] || listing.condition}
                        </span>
                      )}
                    </div>

                    <div className="mb-6 flex gap-2">
                      <button
                        onClick={handleFavoriteToggle}
                        disabled={favoriteLoading}
                        className={`btn ${isFavorite ? 'border border-red-200 bg-red-50 text-red-600' : 'btn-outline'}`}
                      >
                        <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                        {t('listing.actions.favorite', 'Save')}
                      </button>
                      <button onClick={handleShare} className="btn btn-outline">
                        <Share2 size={20} />
                        {t('listing.actions.share', 'Share')}
                      </button>
                    </div>

                    <section className="mb-6">
                      <h2 className="mb-2 text-xl font-bold text-slate-950">{t('listing.sections.description', 'Description')}</h2>
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                        {listing.description}
                      </p>
                    </section>

                    <section className="mb-6 border-t border-slate-200 pt-4">
                      <h2 className="mb-3 text-xl font-bold text-slate-950">{t('listing.sections.details', 'Details')}</h2>
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm text-slate-500">{t('listing.details.category', 'Category')}</dt>
                          <dd className="font-semibold text-slate-900">{categoryLabel || t('listing.details.unknown', 'Uncategorized')}</dd>
                        </div>
                        {listing.condition && (
                          <div>
                            <dt className="text-sm text-slate-500">{t('listing.details.condition', 'Condition')}</dt>
                            <dd className="font-semibold text-slate-900">{conditionLabels[listing.condition] || listing.condition}</dd>
                          </div>
                        )}
                        {locationLabel && (
                          <div>
                            <dt className="text-sm text-slate-500">{t('listing.details.region', 'Region')}</dt>
                            <dd className="flex items-center gap-1 font-semibold text-slate-900">
                              <MapPin size={16} aria-hidden="true" />
                              {locationLabel}
                            </dd>
                          </div>
                        )}
                        {listing.stock !== undefined && (
                          <div>
                            <dt className="text-sm text-slate-500">{t('listing.details.stock', 'Available stock')}</dt>
                            <dd className="font-semibold text-slate-900">{listing.stock}</dd>
                          </div>
                        )}
                      </dl>
                    </section>

                    {listing.seller && (
                      <SellerCard
                        seller={listing.seller}
                        profileId={sellerProfileId}
                        sectionTitle={t('listing.sections.seller', 'Seller')}
                        reviewsLabel={(count) => t('listing.seller.reviews', '{{count}} reviews', { count })}
                      />
                    )}
                  </div>

                  <ListingActions
                    isOwnListing={isOwnListing}
                    isAvailable={isAvailable}
                    contactLoading={contactLoading}
                    deleteLoading={deleteLoading}
                    onContactSeller={handleContactSeller}
                    onReport={() => {
                      if (!requireAuth()) return;
                      setReportOpen(true);
                    }}
                    onEdit={() => router.push(`/seller/listings/${listing.id}/edit`)}
                    onDelete={handleDeleteListing}
                    t={(key, def) => t(key, { defaultValue: def })}
                  />
                  <TrustBadges
                    safeLabel={t('listing.trust.safe', 'Secure payment')}
                    shippingLabel={t('listing.trust.fastShipping', 'Fast delivery')}
                    qualityLabel={t('listing.trust.quality', 'Quality guaranteed')}
                  />
                </div>
              </div>
            </article>
          </div>
        </div>
      </Layout>

      {listing?.id ? (
        <ReportDialog
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          onSubmitted={() => setReportOpen(false)}
          targetType="Listing"
          targetId={listing.id}
        />
      ) : null}
    </>
  );
}

export const getServerSideProps: GetServerSideProps<ListingDetailProps> = async ({ params, locale, res }) => {
  const idSegment = typeof params?.id === 'string' ? params.id : '';
  const listingId = parseListingId(idSegment);

  if (!listingId) {
    return { notFound: true };
  }

  const listing = await fetchListingByIdSSR(listingId);
  if (!listing) {
    return { notFound: true };
  }

  const canonicalPath = listingPath(listing);
  const requestedPath = `/listing/${idSegment}`;

  // 301-redirect legacy bare-UUID URLs (and any non-canonical slug) to the canonical slug+id URL.
  if (canonicalPath !== requestedPath) {
    return {
      redirect: {
        destination: canonicalPath,
        permanent: true,
      },
    };
  }

  const seoLocale = (locale || 'ar').startsWith('ar') ? 'ar' : 'en';
  const categoryLabel = getCategoryLabelFromValue(listing.categoryPath, seoLocale) || '';

  let regionLabel = '';
  if (listing.region) {
    const key = getCityI18nKeyFromValue(listing.region);
    // We don't have `t` server-side; fall back to the static label which is locale-aware.
    regionLabel = key ? getCityLabel(listing.region, seoLocale) : getCityLabel(listing.region, seoLocale);
  }

  // Light caching at the CDN/edge for SEO crawlers; still fresh enough for sellers.
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');

  return {
    props: {
      initialListing: listing,
      canonicalPath,
      categoryLabel,
      regionLabel,
      locale: seoLocale as SeoLocale,
      ...(await serverSideTranslations(locale ?? 'ar', ['common'])),
    },
  };
};
