import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { getMyListings, deleteListing } from '@/lib/api/listings';
import { Product } from '@sbay/shared';
import { Loader2, AlertCircle, Plus, Edit, Trash2, Eye, Package } from 'lucide-react';
import { formatPrice } from '@/lib/cartStore';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function MyListingsPage() {
  const router = useRouter();
  const isAuthed = useRequireAuth();
  const [listings, setListings] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'sold'>('all');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAuthed) return;
    loadListings();
  }, [isAuthed]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await getMyListings();
      setListings(data);
    } catch (err: any) {
      console.error('Error loading listings:', err);
      setError('فشل تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    try {
      setDeleting(true);
      setDeleteId(id);
      await deleteListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      alert('فشل حذف المنتج');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const filteredListings = listings.filter(listing => {
    if (filter === 'all') return true;
    return listing.status === filter;
  });

  if (loading) {
    return (
      <Layout title="منتجاتي - سباي">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">جارٍ التحميل...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="منتجاتي - سباي">
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">منتجاتي</h1>
                <p className="text-gray-600 mt-1">
                  {filteredListings.length} منتج
                </p>
              </div>
              <button
                onClick={() => router.push('/listing/sell')}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={20} />
                إضافة منتج جديد
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-4 mt-6 border-b">
              <button
                onClick={() => setFilter('all')}
                className={`pb-3 px-2 font-medium transition-colors ${
                  filter === 'all'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                الكل ({listings.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`pb-3 px-2 font-medium transition-colors ${
                  filter === 'active'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                نشط ({listings.filter(l => l.status === 'active').length})
              </button>
              <button
                onClick={() => setFilter('sold')}
                className={`pb-3 px-2 font-medium transition-colors ${
                  filter === 'sold'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                مباع ({listings.filter(l => l.status === 'sold').length})
              </button>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="container mx-auto px-4 py-8">
          {error ? (
            <div className="text-center py-20">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                لا توجد منتجات
              </h2>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? 'ابدأ بإضافة منتجك الأول'
                  : `لا توجد منتجات ${filter === 'active' ? 'نشطة' : 'مباعة'}`
                }
              </p>
              <button
                onClick={() => router.push('/listing/sell')}
                className="btn btn-primary"
              >
                أضف منتج الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map(listing => (
                <div
                  key={listing.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-gray-100">
                    {listing.imageUrls?.[0] ? (
                      <img
                        src={listing.imageUrls[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        📦
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          listing.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {listing.status === 'active' ? 'نشط' : 'مباع'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {listing.title}
                    </h3>
                    <p className="text-lg font-bold text-primary-600 mb-3">
                      {formatPrice(listing.priceAmount, listing.priceCurrency)}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span>المخزون: {listing.stock}</span>
                      <span>المشاهدات: {listing.views || 0}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/listing/${listing.id}`)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye size={16} />
                        عرض
                      </button>
                      <button
                        onClick={() => router.push(`/seller/listings/${listing.id}/edit`)}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit size={16} />
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(listing.id)}
                        disabled={deleting && deleteId === listing.id}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deleting && deleteId === listing.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
