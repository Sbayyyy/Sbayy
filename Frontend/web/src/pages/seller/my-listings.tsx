import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getMyListings, deleteListing } from '@/lib/api/listings';
import { Product } from '@sbay/shared';
import { Loader2, AlertCircle, Plus, Edit, Trash2, Eye, Package, Zap } from 'lucide-react';
import { formatPrice } from '@/lib/cartStore';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { toast } from '@/lib/toast';
import { createBoostPayment, getBoostOptions, type BoostOption } from '@/lib/api/monetization';

export default function MyListingsPage() {
  const router = useRouter();
  const isAuthed = useRequireAuth();
  const { t } = useTranslation('common');
  const [listings, setListings] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'sold'>('all');
  const [deleting, setDeleting] = useState(false);
  const [boostOptions, setBoostOptions] = useState<BoostOption[]>([]);
  const [boostListingId, setBoostListingId] = useState<string | null>(null);
  const [selectedBoostOption, setSelectedBoostOption] = useState('');
  const [boosting, setBoosting] = useState(false);

  useEffect(() => {
    if (!isAuthed) return;
    loadListings();
    getBoostOptions()
      .then((options) => {
        setBoostOptions(options);
        setSelectedBoostOption(options[0]?.id ?? '');
      })
      .catch(() => setBoostOptions([]));
  }, [isAuthed]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await getMyListings();
      setListings(data);
    } catch (err: unknown) {
      console.error('Error loading listings:', err);
      setError(t('myListings.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      setDeleteId(id);
      await deleteListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success(t('myListings.deleteSuccess', { defaultValue: 'Listing deleted.' }));
    } catch (err) {
      toast.error(t('myListings.deleteError'));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBoost = async () => {
    if (!boostListingId || !selectedBoostOption || boosting) return;
    try {
      setBoosting(true);
      const transaction = await createBoostPayment(
        boostListingId,
        selectedBoostOption,
        typeof window !== 'undefined' ? window.location.href : undefined,
      );
      toast.success('Boost payment created. Boost activates after payment confirmation.');
      setBoostListingId(null);
      if (transaction.checkoutUrl) {
        window.location.href = transaction.checkoutUrl;
      }
    } catch (err) {
      console.error('Boost payment failed:', err);
      toast.error('Unable to create boost payment.');
    } finally {
      setBoosting(false);
    }
  };

  const getListingStatus = (listing: Product) => {
    const status = listing.status?.toLowerCase();
    if (status === 'deleted') return 'deleted';
    if (status === 'sold' || (status === 'active' && listing.stock <= 0)) return 'sold';
    if (status === 'hidden' || status === 'inactive') return 'inactive';
    return 'active';
  };

  const visibleListings = listings.filter(listing => getListingStatus(listing) !== 'deleted');
  const activeListings = visibleListings.filter(listing => getListingStatus(listing) === 'active');
  const soldListings = visibleListings.filter(listing => getListingStatus(listing) === 'sold');

  const filteredListings = listings.filter(listing => {
    const status = getListingStatus(listing);
    if (status === 'deleted') return false;
    if (filter === 'all') return true;
    return status === filter;
  });

  if (loading) {
    return (
      <Layout title={t('myListings.title')}>
        <div className="app-page flex items-center justify-center px-4 py-16">
          <div className="empty-state">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary-600" />
            <p className="font-medium text-slate-600">{t('myListings.loading')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('myListings.title')}>
      <div className="app-page">
        <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="page-kicker">{t('nav.myListings')}</p>
                <h1 className="page-title">{t('myListings.heading')}</h1>
                <p className="page-subtitle">
                  {t('myListings.productCount', { count: filteredListings.length })}
                </p>
              </div>
              <button
                onClick={() => router.push('/listing/sell')}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={20} />
                {t('myListings.addNew')}
              </button>
            </div>

            <div className="mt-6 flex w-full gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-1 sm:w-fit">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {t('myListings.filterAll', { count: visibleListings.length })}
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  filter === 'active'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {t('myListings.filterActive', { count: activeListings.length })}
              </button>
              <button
                onClick={() => setFilter('sold')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  filter === 'sold'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {t('myListings.filterSold', { count: soldListings.length })}
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {error ? (
            <div className="empty-state">
              <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
              <p className="font-medium text-red-600">{error}</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="empty-state">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
                <Package className="h-10 w-10 text-primary-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-slate-950">
                {t('myListings.emptyTitle')}
              </h2>
              <p className="mb-6 text-slate-600">
                {filter === 'all'
                  ? t('myListings.emptyAllMessage')
                  : filter === 'active'
                    ? t('myListings.emptyActiveMessage')
                    : t('myListings.emptySoldMessage')
                }
              </p>
              <button
                onClick={() => router.push('/listing/sell')}
                className="btn btn-primary"
              >
                {t('myListings.addNow')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredListings.map(listing => (
                <div
                  key={listing.id}
                  className="surface-card surface-card-hover group overflow-hidden"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {listing.imageUrls?.[0] ? (
                      <img
                        src={listing.imageUrls[0]}
                        alt={listing.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-12 w-12 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`status-pill ${
                          getListingStatus(listing) === 'active'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white/95 text-slate-700'
                        }`}
                      >
                        {getListingStatus(listing) === 'active' ? t('myListings.statusActive') : t('myListings.statusSold')}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="mb-2 line-clamp-2 min-h-[3rem] font-semibold leading-6 text-slate-950">
                      {listing.title}
                    </h3>
                    <p className="mb-3 text-xl font-bold text-primary-700">
                      {formatPrice(listing.priceAmount, listing.priceCurrency)}
                    </p>
                    <div className="mb-4 flex items-center gap-4 text-sm text-slate-500">
                      <span>{t('myListings.stock', { count: listing.stock })}</span>
                      <span>{t('myListings.views', { count: listing.views || 0 })}</span>
                      {listing.isBoosted && <span className="font-semibold text-amber-700">Boosted</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => router.push(`/listing/${listing.id}`)}
                        className="btn btn-outline flex-1 px-3"
                      >
                        <Eye size={16} />
                        {t('myListings.view')}
                      </button>
                      <button
                        onClick={() => router.push(`/seller/listings/${listing.id}/edit`)}
                        className="btn btn-primary flex-1 px-3"
                      >
                        <Edit size={16} />
                        {t('myListings.edit')}
                      </button>
                      <button
                        onClick={() => {
                          setBoostListingId(listing.id);
                          if (!selectedBoostOption) setSelectedBoostOption(boostOptions[0]?.id ?? '');
                        }}
                        disabled={getListingStatus(listing) !== 'active'}
                        className="btn btn-outline border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        <Zap size={16} />
                        Boost
                      </button>
                      <button
                        onClick={() => setDeleteId(listing.id)}
                        disabled={deleting && deleteId === listing.id}
                        className="btn btn-outline border-red-200 px-3 text-red-600 hover:bg-red-50"
                        aria-label={t('myListings.delete', { defaultValue: 'Delete' })}
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
      <ConfirmDialog
        isOpen={Boolean(deleteId) && !deleting}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) void handleDelete(deleteId);
        }}
        title={t('myListings.deleteTitle', { defaultValue: 'Delete listing?' })}
        message={t('myListings.deleteConfirm')}
        confirmText={t('myListings.delete', { defaultValue: 'Delete' })}
        danger
      />
      {boostListingId && (
        <>
          <div className="modal-backdrop" onClick={() => setBoostListingId(null)} />
          <div className="modal-card max-w-lg">
            <div className="mb-5">
              <p className="page-kicker">Listing boost</p>
              <h3 className="text-xl font-bold text-slate-950">Promote this listing</h3>
              <p className="mt-2 text-sm text-slate-600">
                Basic listings remain free. Boosts activate only after a trusted payment confirmation.
              </p>
            </div>
            <div className="space-y-3">
              {boostOptions.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 p-4 transition-colors hover:border-amber-200 hover:bg-amber-50/40">
                  <span>
                    <span className="block font-semibold text-slate-950">{option.name}</span>
                    <span className="text-sm text-slate-500">{option.durationDays} days</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-bold text-amber-700">
                      {option.price.toLocaleString()} {option.currency}
                    </span>
                    <input
                      type="radio"
                      name="boost-option"
                      checked={selectedBoostOption === option.id}
                      onChange={() => setSelectedBoostOption(option.id)}
                    />
                  </span>
                </label>
              ))}
              {boostOptions.length === 0 && (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Boost options are unavailable.
                </p>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button className="btn btn-outline flex-1" onClick={() => setBoostListingId(null)}>
                Cancel
              </button>
              <button className="btn btn-primary flex-1" onClick={handleBoost} disabled={!selectedBoostOption || boosting}>
                {boosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap size={16} />}
                Create payment
              </button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

export async function getServerSideProps({ locale }: { locale?: string }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'ar', ['common'])) } };
}
