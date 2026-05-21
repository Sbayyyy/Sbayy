import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AdminGate from '@/components/manager/AdminGate';
import {
  deleteAdminListing,
  getAdminListings,
  updateAdminListingStatus,
  type AdminListing,
} from '@/lib/api/adminManagement';
import { useAuthStore } from '@/lib/store';

export default function ManagerListingsPage() {
  const { user } = useAuthStore();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setIsLoading(true);
    setError(null);
    try {
      setListings(await getAdminListings({ q: query || undefined, status: status || undefined, take: 100 }));
    } catch {
      setError('Could not load listings.');
    } finally {
      setIsLoading(false);
    }
  }, [query, status, user?.role]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  async function runAction(action: () => Promise<unknown>, message: string) {
    if (!window.confirm(message)) return;
    setError(null);
    try {
      await action();
      await loadListings();
    } catch {
      setError('Action failed. Make sure your admin session is still valid.');
    }
  }

  return (
    <Layout title="Manage Listings">
      <AdminGate>
        <div className="py-8">
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-blue-700">Managers</p>
              <h1 className="mt-2 text-3xl font-semibold text-gray-950">Listings</h1>
              <p className="mt-2 text-sm text-gray-600">Hide, restore, or delete marketplace listings.</p>
            </div>
            <Link href="/manager/dashboard" className="text-sm font-semibold text-blue-700 hover:underline">
              Back to dashboard
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search title or description"
              className="h-10 flex-1 rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="hidden">Hidden</option>
              <option value="deleted">Deleted</option>
            </select>
            <button
              type="button"
              onClick={loadListings}
              disabled={isLoading}
              className="h-10 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-gray-400"
            >
              {isLoading ? 'Loading' : 'Search'}
            </button>
          </div>

          {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Listing</th>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listings.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-950">{item.title}</div>
                        <div className="text-xs text-gray-500">{[item.categoryPath, item.region].filter(Boolean).join(' · ') || item.id}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.sellerEmail || item.sellerId}</td>
                      <td className="px-4 py-3 text-gray-700">{item.status}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {item.priceAmount.toLocaleString()} {item.priceCurrency}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {item.status === 'hidden' ? (
                            <button
                              type="button"
                              onClick={() => runAction(() => updateAdminListingStatus(item.id, 'active'), `Restore "${item.title}"?`)}
                              className="rounded-md border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => runAction(() => updateAdminListingStatus(item.id, 'hidden'), `Hide "${item.title}"?`)}
                              className="rounded-md border border-amber-200 px-3 py-1.5 font-semibold text-amber-700 hover:bg-amber-50"
                            >
                              Hide
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => runAction(() => deleteAdminListing(item.id), `Delete "${item.title}"?`)}
                            className="rounded-md border border-red-200 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {listings.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>No listings found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminGate>
    </Layout>
  );
}
