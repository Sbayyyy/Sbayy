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
import { Product } from '@sbay/shared';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function ListingDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuthStore();
  
  const [listing, setListing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      setError(err.response?.data?.message || 'فشل تحميل المنتج');
    } finally {
      setLoading(false);
    }
  };
  const requireAuth = () => {
    if (isAuthenticated) return true;
    const redirectTo = encodeURIComponent(router.asPath);
    router.push(`/auth/login?redirect=${redirectTo}`);
    return false;
  };
  const handleContactSeller = () => {
    if (!requireAuth()) return;
    // TODO: Implement messaging
    toast.info('سيتم فتح محادثة مع البائع');
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
      alert('تم نسخ الرابط');
    }
  };

  const handleDeleteListing = async () => {
    if (!listing || deleteLoading) return;
    if (!requireAuth()) return;
    const confirmed = window.confirm('هل أنت متأكد من حذف هذا الإعلان؟');
    if (!confirmed) return;

    setDeleteLoading(true);
    try {
      await deleteListing(listing.id);
      toast.success('تم حذف الإعلان');
      router.push('/');
    } catch (err) {
      console.error('Error deleting listing:', err);
      toast.error('حدث خطأ أثناء حذف الإعلان');
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
        toast.success('تمت إضافة المنتج إلى المفضلة');
      } else {
        await removeFavorite(listing.id);
        toast.success('تمت إزالة المنتج من المفضلة');
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
      setIsFavorite(!nextIsFavorite);
      toast.error('حدث خطأ أثناء تحديث المفضلة');
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
          <p className="text-red-600 mb-4">{error || 'المنتج غير موجود'}</p>
          <button
            onClick={() => router.push('/')}
            className="text-primary-600 hover:underline"
          >
            العودة إلى الصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  const conditionLabels: Record<string, string> = {
    'New': 'جديد',
    'LikeNew': 'كالجديد',
    'Good': 'جيد',
    'Fair': 'مقبول',
    'Poor': 'سيئ',
    'Used': 'مستعمل',
    'Refurbished': 'مجدد'
  };

  const isAvailable = listing.stock === undefined || listing.stock > 0;
  const isOwnListing = user?.id === (listing.sellerId || listing.seller?.id);

  return (
    <>
      <Head>
        <title>{listing.title} - سباي</title>
        <meta name="description" content={listing.description} />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-4 text-sm">
            <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-700">
              الرئيسية
            </button>
            <span className="mx-2 text-gray-400">/</span>
            <button onClick={() => router.push(`/?category=${listing.categoryPath}`)} className="text-gray-500 hover:text-gray-700">
              {listing.categoryPath || 'منتجات'}
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
                            aria-label="الصورة السابقة"
                          >
                            <ChevronLeft size={24} />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                            aria-label="الصورة التالية"
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
                      {listing.priceAmount.toLocaleString('ar-SY')} {listing.priceCurrency || 'ل.س'}
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
                      حفظ
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      <Share2 size={20} />
                      مشاركة
                    </button>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">الوصف</h2>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {listing.description}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="border-t pt-4 mb-6">
                    <h2 className="text-xl font-semibold mb-3">التفاصيل</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">الفئة</p>
                        <p className="font-medium">{listing.categoryPath || 'غير مصنف'}</p>
                      </div>
                      {listing.condition && (
                        <div>
                          <p className="text-sm text-gray-500">الحالة</p>
                          <p className="font-medium">{conditionLabels[listing.condition] || listing.condition}</p>
                        </div>
                      )}
                      {listing.region && (
                        <div>
                          <p className="text-sm text-gray-500">الموقع</p>
                          <p className="font-medium flex items-center gap-1">
                            <MapPin size={16} />
                            {listing.region}
                          </p>
                        </div>
                      )}
                      {listing.stock !== undefined && (
                        <div>
                          <p className="text-sm text-gray-500">الكمية المتوفرة</p>
                          <p className="font-medium">{listing.stock}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seller Info */}
                  {listing.seller && (
                    <div className="border-t pt-4 mb-6">
                      <h2 className="text-xl font-semibold mb-3">البائع</h2>
                      {listing.seller.id ? (
                        <Link
                          href={`/seller/${listing.seller.id}`}
                          className="flex items-center gap-4 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 p-3 -m-3 transition-colors"
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
                                {listing.seller.reviewCount} تقييم
                              </p>
                            )}
                            {listing.seller.city && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin size={12} />
                                {listing.seller.city}
                              </p>
                            )}
                          </div>
                        </Link>
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
                                {listing.seller.reviewCount} تقييم
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
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-center">
                      المنتج غير متوفر حالياً
                    </div>
                  ) : null}

                  {!isOwnListing && (
                    <button
                      onClick={handleContactSeller}
                      className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      <MessageCircle size={20} />
                      تواصل مع البائع
                    </button>
                  )}

                  {isOwnListing && (
                    <div className="flex flex-col gap-3">
                      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-center">
                        هذا إعلانك
                      </div>
                      <button
                        onClick={() => router.push(`/seller/listings/${listing.id}/edit`)}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium transition-colors"
                      >
                        تعديل الإعلان
                      </button>
                      <button
                        onClick={handleDeleteListing}
                        disabled={deleteLoading}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-70"
                      >
                        {deleteLoading ? 'جارٍ الحذف...' : 'حذف الإعلان'}
                      </button>
                    </div>
                  )}

                  {/* Trust Badges */}
                  <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                    <div>
                      <Shield className="mx-auto mb-2 text-green-600" size={24} />
                      <p className="text-xs text-gray-600">دفع آمن</p>
                    </div>
                    <div>
                      <Package className="mx-auto mb-2 text-blue-600" size={24} />
                      <p className="text-xs text-gray-600">توصيل سريع</p>
                    </div>
                    <div>
                      <Shield className="mx-auto mb-2 text-primary-600" size={24} />
                      <p className="text-xs text-gray-600">ضمان الجودة</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
