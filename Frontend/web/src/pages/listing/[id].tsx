import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Heart, Share2, MapPin } from 'lucide-react';
import { deleteListing, getListingById } from '@/lib/api/listings';
import { addFavorite, getFavorites, removeFavorite } from '@/lib/api/favorites';
import { openChat } from '@/lib/api/messages';
import { Product } from '@sbay/shared';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import ReportDialog from '@/components/ReportDialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import { CONDITION_LABEL_MAP, CONDITION_I18N_MAP } from '@/lib/constants';
import { formatPrice } from '@/lib/formatters';
import { useRequireAuthAction } from '@/lib/hooks/useRequireAuthAction';
import { ImageGallery, SellerCard, ListingActions, TrustBadges } from '@/components/listing';

export default function ListingDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation('common');
  const locale = router.locale ?? 'ar';
  const requireAuth = useRequireAuthAction();
  const queryClient = useQueryClient();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const listingId = typeof id === 'string' ? id : undefined;

  const { data: listing, isLoading: loading, error: listingError } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => getListingById(listingId!),
    enabled: !!listingId,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: getFavorites,
    enabled: isAuthenticated,
  });

  const isFavorite = listing ? favorites.some(f => f.id === listing.id) : false;
  const error = listingError ? t('listing.errors.load', 'Failed to load listing') : '';

  const handleContactSeller = () => {
    if (!requireAuth()) return;
    if (!listing || contactLoading) return;
    const otherUserId = listing.seller?.id || listing.sellerId;
    if (!otherUserId) {
      toast.error(t('listing.actions.openChatError', 'Unable to open chat.'));
      return;
    }
    setContactLoading(true);
    openChat({ otherUserId, listingId: listing.id })
      .then(({ id }) => {
        router.push(`/messages/${id}`);
      })
      .catch((err) => {
        console.error('Error opening chat:', err);
        toast.error(t('listing.actions.openChatError', 'Unable to open chat.'));
      })
      .finally(() => {
        setContactLoading(false);
      });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.title,
          text: listing?.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(t('listing.share.copied', 'Link copied.'));
    }
  };

  const handleDeleteListing = async () => {
    if (!listing || deleteLoading) return;
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
    if (!requireAuth() || !listing) return;
    if (favoriteLoading) return;

    const nextIsFavorite = !isFavorite;
    // Optimistic update in cache
    queryClient.setQueryData<{ id: string }[]>(['favorites'], (prev = []) =>
      nextIsFavorite
        ? [...prev, { id: listing.id }]
        : prev.filter(f => f.id !== listing.id)
    );
    setFavoriteLoading(true);
    try {
      if (nextIsFavorite) {
        await addFavorite(listing.id);
        toast.success(t('listing.actions.favoriteAdded', 'Added to favorites.'));
      } else {
        await removeFavorite(listing.id);
        toast.success(t('listing.actions.favoriteRemoved', 'Removed from favorites.'));
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
      // Rollback optimistic update
      queryClient.setQueryData<{ id: string }[]>(['favorites'], (prev = []) =>
        nextIsFavorite
          ? prev.filter(f => f.id !== listing.id)
          : [...prev, { id: listing.id }]
      );
      toast.error(t('listing.actions.favoriteError', 'Failed to update favorites.'));
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || t('listing.errors.notFound', 'Listing not found')}</p>
          <button
            onClick={() => router.push('/')}
            className="text-primary-600 hover:underline"
          >
            {t('listing.actions.backHome', 'Back to home')}
          </button>
        </div>
      </div>
    );
  }

  const conditionLabels: Record<string, string> = Object.fromEntries(
    Object.entries(CONDITION_I18N_MAP).map(([value, i18nKey]) => [
      value,
      t(i18nKey, CONDITION_LABEL_MAP[value] || value)
    ])
  );

  const isAvailable = listing.stock === undefined || listing.stock > 0;
  const sellerProfileId = listing.seller?.id || listing.sellerId;
  const isOwnListing = user?.id === sellerProfileId;

  return (
    <>
      <Head>
        <title>{t('listing.meta.title', '{{title}} - SBay', { title: listing.title })}</title>
        <meta name="description" content={listing.description} />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-4 text-sm">
            <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-700">
              {t('listing.breadcrumbs.home', 'Home')}
            </button>
            <span className="mx-2 text-gray-400">/</span>
            <button onClick={() => router.push(`/?category=${listing.categoryPath}`)} className="text-gray-500 hover:text-gray-700">
              {listing.categoryPath || t('listing.breadcrumbs.categoryFallback', 'Listings')}
            </button>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900 truncate max-w-xs inline-block">{listing.title}</span>
          </nav>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
              {/* Image Gallery */}
              <ImageGallery
                images={listing.imageUrls || []}
                title={listing.title}
                selectedIndex={selectedImageIndex}
                onSelectIndex={setSelectedImageIndex}
                prevLabel={t('listing.images.previous', 'Previous image')}
                nextLabel={t('listing.images.next', 'Next image')}
              />

              {/* Product Info */}
              <div className="flex flex-col">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {listing.title}
                  </h1>

                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-3xl font-bold text-primary-600">
                      {formatPrice(listing.priceAmount, locale, listing.priceCurrency || t('listing.details.currencyFallback', 'SYP'))}
                    </span>
                    {listing.condition && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {conditionLabels[listing.condition] || listing.condition}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={handleFavoriteToggle}
                      disabled={favoriteLoading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                        isFavorite
                          ? 'bg-red-50 border-red-300 text-red-600'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                      {t('listing.actions.favorite', 'Save')}
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      <Share2 size={20} />
                      {t('listing.actions.share', 'Share')}
                    </button>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">{t('listing.sections.description', 'Description')}</h2>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {listing.description}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="border-t pt-4 mb-6">
                    <h2 className="text-xl font-semibold mb-3">{t('listing.sections.details', 'Details')}</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">{t('listing.details.category', 'Category')}</p>
                        <p className="font-medium">{listing.categoryPath || t('listing.details.unknown', 'Uncategorized')}</p>
                      </div>
                      {listing.condition && (
                        <div>
                          <p className="text-sm text-gray-500">{t('listing.details.condition', 'Condition')}</p>
                          <p className="font-medium">{conditionLabels[listing.condition] || listing.condition}</p>
                        </div>
                      )}
                      {listing.region && (
                        <div>
                          <p className="text-sm text-gray-500">{t('listing.details.region', 'Region')}</p>
                          <p className="font-medium flex items-center gap-1">
                            <MapPin size={16} />
                            {listing.region}
                          </p>
                        </div>
                      )}
                      {listing.stock !== undefined && (
                        <div>
                          <p className="text-sm text-gray-500">{t('listing.details.stock', 'Available stock')}</p>
                          <p className="font-medium">{listing.stock}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seller Info */}
                  {listing.seller && (
                    <SellerCard
                      seller={listing.seller}
                      profileId={sellerProfileId}
                      sectionTitle={t('listing.sections.seller', 'Seller')}
                      reviewsLabel={(count) => t('listing.seller.reviews', '{{count}} reviews', { count })}
                    />
                  )}
                </div>

                {/* Action Buttons + Trust Badges */}
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
          </div>
        </div>
      </div>

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

export async function getServerSideProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}
