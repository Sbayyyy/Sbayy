import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { 
  Heart, 
  Share2, 
  MapPin, 
  Package, 
  Shield, 
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Star
} from 'lucide-react';
import { deleteListing, getListingById } from '@/lib/api/listings';
import { addFavorite, getFavorites, removeFavorite } from '@/lib/api/favorites';
import { openChat } from '@/lib/api/messages';
import { Product } from '@sbay/shared';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import ReportDialog from '@/components/ReportDialog';

export default function ListingDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation('common');
  const locale = router.locale ?? 'ar';
  
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
    } catch (err: any) {
      console.error('Error loading listing:', err);
      setError(err.response?.data?.message || t('listing.errors.load', 'Failed to load listing'));
    } finally {
      setLoading(false);
    }
  };
  const requireAuth = () => {
    if (isAuthenticated) return true;
    const redirectPath = listing?.id
      ? `/listing/${listing.id}`
      : typeof id === 'string'
        ? `/listing/${id}`
        : '/';
    const redirectTo = encodeURIComponent(redirectPath);
    router.push(`/auth/login?redirect=${redirectTo}`);
    return false;
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
      .then(({ chatId }) => {
        router.push(`/messages/${chatId}`);
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

  const nextImage = () => {
    if (listing?.imageUrls && listing.imageUrls.length > 0) {
      setSelectedImageIndex((prev) => 
        prev === listing.imageUrls.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (listing?.imageUrls && listing.imageUrls.length > 0) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? listing.imageUrls.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
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

  const conditionLabels: Record<string, string> = {
    New: t('listing.conditions.new', 'New'),
    LikeNew: t('listing.conditions.likeNew', 'Like new'),
    Good: t('listing.conditions.good', 'Good'),
    Fair: t('listing.conditions.fair', 'Fair'),
    Poor: t('listing.conditions.poor', 'Poor'),
    Used: t('listing.conditions.used', 'Used'),
    Refurbished: t('listing.conditions.refurbished', 'Refurbished')
  };

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
              <div>
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                  {listing.imageUrls && listing.imageUrls.length > 0 ? (
                    <>
                      <img
                        src={listing.imageUrls[selectedImageIndex]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                      {listing.imageUrls.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                            aria-label={t('listing.images.previous', 'Previous image')}
                          >
                            <ChevronLeft size={24} />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                            aria-label={t('listing.images.next', 'Next image')}
                          >
                            <ChevronRight size={24} />
                          </button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                            {selectedImageIndex + 1} / {listing.imageUrls.length}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package size={64} className="text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {listing.imageUrls && listing.imageUrls.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {listing.imageUrls.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImageIndex === index
                            ? 'border-primary-600 ring-2 ring-primary-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${listing.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex flex-col">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {listing.title}
                  </h1>

                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-3xl font-bold text-primary-600">
                      {listing.priceAmount.toLocaleString(locale === 'ar' ? 'ar-SY' : 'en-US')} {listing.priceCurrency || t('listing.details.currencyFallback', 'SYP')}
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
                    <div className="border-t pt-4 mb-6">
                      <h2 className="text-xl font-semibold mb-3">{t('listing.sections.seller', 'Seller')}</h2>
                      {sellerProfileId ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/seller/${sellerProfileId}`)}
                          className="flex w-full items-center gap-4 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 p-3 -m-3 transition-colors text-left"
                        >
                          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                            {listing.seller.avatar ? (
                              <img
                                src={listing.seller.avatar}
                                alt={listing.seller.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-primary-600 font-bold text-lg">
                                {listing.seller.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{listing.seller.name}</p>
                            {listing.seller.rating !== undefined && (
                              <div className="flex items-center gap-1 text-sm">
                                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                <span className="text-gray-600">{listing.seller.rating.toFixed(1)}</span>
                              </div>
                            )}
                            {listing.seller.reviewCount !== undefined && (
                              <p className="text-xs text-gray-500">
                                {t('listing.seller.reviews', '{{count}} reviews', { count: listing.seller.reviewCount })}
                              </p>
                            )}
                            {listing.seller.city && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin size={12} />
                                {listing.seller.city}
                              </p>
                            )}
                          </div>
                        </button>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                            {listing.seller.avatar ? (
                              <img
                                src={listing.seller.avatar}
                                alt={listing.seller.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-primary-600 font-bold text-lg">
                                {listing.seller.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{listing.seller.name}</p>
                            {listing.seller.rating !== undefined && (
                              <div className="flex items-center gap-1 text-sm">
                                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                <span className="text-gray-600">{listing.seller.rating.toFixed(1)}</span>
                              </div>
                            )}
                            {listing.seller.reviewCount !== undefined && (
                              <p className="text-xs text-gray-500">
                                {t('listing.seller.reviews', '{{count}} reviews', { count: listing.seller.reviewCount })}
                              </p>
                            )}
                            {listing.seller.city && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin size={12} />
                                {listing.seller.city}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="border-t pt-6 mt-6">
                  {!isAvailable ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-center">{t('listing.availability.unavailable', 'This item is currently unavailable.')}</div>
                  ) : null}

                  {!isOwnListing && (
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleContactSeller}
                        disabled={contactLoading}
                        className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-70"
                      >
                        <MessageCircle size={20} />
                        {contactLoading ? t('listing.actions.openChatLoading', 'Opening chat...') : t('listing.actions.contactSeller', 'Message seller')}
                      </button>
                      <button
                        onClick={() => {
                          if (!requireAuth()) return;
                          setReportOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-700 px-6 py-3 rounded-lg hover:bg-red-50 font-medium transition-colors"
                      >
                        {t('report.actions.reportListing', { defaultValue: 'Report listing' })}
                      </button>
                    </div>
                  )}

                  {isOwnListing && (
                    <div className="flex flex-col gap-3">
                      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-center">{t('listing.owner.notice', 'This is your listing.')}</div>
                      <button
                        onClick={() => router.push(`/seller/listings/${listing.id}/edit`)}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium transition-colors"
                      >
                        {t('listing.actions.edit', 'Edit listing')}
                      </button>
                      <button
                        onClick={handleDeleteListing}
                        disabled={deleteLoading}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-70"
                      >
                        {deleteLoading ? t('listing.actions.deleteLoading', 'Deleting...') : t('listing.actions.delete', 'Delete listing')}
                      </button>
                    </div>
                  )}

                  {/* Trust Badges */}
                  <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                    <div>
                      <Shield className="mx-auto mb-2 text-green-600" size={24} />
                      <p className="text-xs text-gray-600">{t('listing.trust.safe', 'Secure payment')}</p>
                    </div>
                    <div>
                      <Package className="mx-auto mb-2 text-blue-600" size={24} />
                      <p className="text-xs text-gray-600">{t('listing.trust.fastShipping', 'Fast delivery')}</p>
                    </div>
                    <div>
                      <Shield className="mx-auto mb-2 text-primary-600" size={24} />
                      <p className="text-xs text-gray-600">{t('listing.trust.quality', 'Quality guaranteed')}</p>
                    </div>
                  </div>
                </div>
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




