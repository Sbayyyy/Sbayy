import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
import { CONDITION_LABEL_MAP, CONDITION_I18N_MAP, getCategoryLabelFromValue } from '@/lib/constants';
import { formatPrice } from '@/lib/formatters';
import { useRequireAuthAction } from '@/lib/hooks/useRequireAuthAction';
import { ImageGallery, SellerCard, ListingActions, TrustBadges } from '@/components/listing';
import Layout from '@/components/Layout';

export default function ListingDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation('common');
  const locale = router.locale ?? 'ar';
  const requireAuth = useRequireAuthAction();

  const [listing, setListing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadListing(id);
    }
  }, [id]);

  useEffect(() => {
    const loadFavoriteState = async (listingId: string) => {
      if (!isAuthenticated) {
        setIsFavorite(false);
        return;
      }
      try {
        const favorites = await getFavorites();
        setIsFavorite(favorites.some(item => item.id === listingId));
      } catch (err) {
        console.error('Error loading favorites:', err);
      }
    };

    if (id && typeof id === 'string') {
      void loadFavoriteState(id);
    }
  }, [id, isAuthenticated]);

  const loadListing = async (listingId: string) => {
    try {
      setLoading(true);
      const data = await getListingById(listingId);
      setListing(data);
    } catch (err: unknown) {
      console.error('Error loading listing:', err);
      setError(t('listing.errors.load', 'Failed to load listing'));
    } finally {
      setLoading(false);
    }
  };

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
    setIsFavorite(nextIsFavorite);
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
      setIsFavorite(!nextIsFavorite);
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
      <Layout title={t('listing.errors.notFound', 'Listing not found')}>
        <div className="app-page flex items-center justify-center px-4 py-16">
          <div className="empty-state">
            <p className="mb-4 font-medium text-red-600">{error || t('listing.errors.notFound', 'Listing not found')}</p>
          <button
            onClick={() => router.push('/')}
            className="btn btn-primary"
          >
            {t('listing.actions.backHome', 'Back to home')}
          </button>
          </div>
        </div>
      </Layout>
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
  const categoryLabel = getCategoryLabelFromValue(listing.categoryPath, locale) || t('listing.details.unknown', 'Uncategorized');

  return (
    <>
      <Layout title={t('listing.meta.title', '{{title}} - SBay', { title: listing.title })} description={listing.description}>
      <div className="app-page py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="mb-5 text-sm">
            <button onClick={() => router.push('/')} className="text-slate-500 transition-colors hover:text-slate-900">
              {t('listing.breadcrumbs.home', 'Home')}
            </button>
            <span className="mx-2 text-slate-400">/</span>
            <button onClick={() => router.push(`/?category=${listing.categoryPath}`)} className="text-slate-500 transition-colors hover:text-slate-900">
              {categoryLabel || t('listing.breadcrumbs.categoryFallback', 'Listings')}
            </button>
            <span className="mx-2 text-slate-400">/</span>
            <span className="inline-block max-w-xs truncate text-slate-900">{listing.title}</span>
          </nav>

          <div className="surface-card overflow-hidden">
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

                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={handleFavoriteToggle}
                      disabled={favoriteLoading}
                      className={`btn ${
                        isFavorite
                          ? 'border border-red-200 bg-red-50 text-red-600'
                          : 'btn-outline'
                      }`}
                    >
                      <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                      {t('listing.actions.favorite', 'Save')}
                    </button>
                    <button
                      onClick={handleShare}
                      className="btn btn-outline"
                    >
                      <Share2 size={20} />
                      {t('listing.actions.share', 'Share')}
                    </button>
                  </div>

                  <div className="mb-6">
                    <h2 className="mb-2 text-xl font-bold text-slate-950">{t('listing.sections.description', 'Description')}</h2>
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                      {listing.description}
                    </p>
                  </div>

                  <div className="mb-6 border-t border-slate-200 pt-4">
                    <h2 className="mb-3 text-xl font-bold text-slate-950">{t('listing.sections.details', 'Details')}</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">{t('listing.details.category', 'Category')}</p>
                        <p className="font-semibold text-slate-900">{categoryLabel}</p>
                      </div>
                      {listing.condition && (
                        <div>
                          <p className="text-sm text-slate-500">{t('listing.details.condition', 'Condition')}</p>
                          <p className="font-semibold text-slate-900">{conditionLabels[listing.condition] || listing.condition}</p>
                        </div>
                      )}
                      {listing.region && (
                        <div>
                          <p className="text-sm text-slate-500">{t('listing.details.region', 'Region')}</p>
                          <p className="font-semibold text-slate-900 flex items-center gap-1">
                            <MapPin size={16} />
                            {listing.region}
                          </p>
                        </div>
                      )}
                      {listing.stock !== undefined && (
                        <div>
                          <p className="text-sm text-slate-500">{t('listing.details.stock', 'Available stock')}</p>
                          <p className="font-semibold text-slate-900">{listing.stock}</p>
                        </div>
                      )}
                    </div>
                  </div>

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
          </div>
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

export async function getServerSideProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}
