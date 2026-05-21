import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { getAdminDashboardSummary, type AdminDashboardSummary } from '@/lib/api/adminDashboard';
import AdminGate from '@/components/manager/AdminGate';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';

type DashboardSection = {
  key: keyof AdminDashboardSummary;
  title: string;
  primary: string;
  rows: string[];
};

const sections: DashboardSection[] = [
  { key: 'users', title: 'Users', primary: 'total', rows: ['active', 'blocked', 'deactivated', 'admins', 'sellers', 'unverified'] },
  { key: 'listings', title: 'Listings', primary: 'total', rows: ['active', 'sold', 'hidden', 'deleted'] },
  { key: 'chats', title: 'Chats', primary: 'total', rows: ['messages', 'unreadMessages'] },
  { key: 'reports', title: 'Reports', primary: 'total', rows: ['open', 'reviewed', 'closed'] },
  { key: 'orders', title: 'Orders', primary: 'total', rows: ['pending', 'paid', 'shipped', 'completed', 'cancelled'] },
  { key: 'notifications', title: 'Notifications', primary: 'total', rows: ['unread'] },
  { key: 'commerce', title: 'Commerce', primary: 'reviews', rows: ['favorites', 'payments', 'sponsoredAds', 'activeSponsoredAds'] },
  { key: 'bugReports', title: 'Bug Reports', primary: 'total', rows: ['stored'] },
];

function labelFor(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return 'Not stored';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

export default function ManagerDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setSummary(await getAdminDashboardSummary());
    } catch {
      setError('Could not load the manager dashboard. Make sure your account has admin access.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    void loadSummary();
  }, [loadSummary, user?.role]);

  const generatedAt = useMemo(() => {
    if (!summary?.generatedAt) return null;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(summary.generatedAt));
  }, [summary]);

  return (
    <Layout>
      <AdminGate>
        <div className="py-8">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-700">Managers</p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-950">Operations Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Live platform totals for users, listings, chats, reports, orders, notifications, and commerce.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/manager/users" className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Manage users
              </Link>
              <Link href="/manager/listings" className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Manage listings
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={loadSummary}
            disabled={isLoading}
            className="h-11 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        {generatedAt ? (
          <div className="mt-6 text-sm text-gray-500">Last refreshed {generatedAt}</div>
        ) : null}

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sections.map(section => {
            const data = summary?.[section.key] as Record<string, unknown> | undefined;
            return (
              <article key={section.key} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-600">{section.title}</h2>
                    <div className="mt-3 text-4xl font-semibold tabular-nums text-gray-950">
                      {formatValue(data?.[section.primary])}
                    </div>
                  </div>
                  <span className="mt-1 h-3 w-3 rounded-full bg-blue-600" aria-hidden="true" />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {section.rows.map(row => (
                    <div key={row} className="min-w-0">
                      <dt className="truncate text-gray-500">{labelFor(row)}</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-gray-900">{formatValue(data?.[row])}</dd>
                    </div>
                  ))}
                </dl>
                {section.key === 'bugReports' && typeof data?.note === 'string' ? (
                  <p className="mt-4 border-t border-gray-100 pt-4 text-xs leading-5 text-gray-500">{data.note}</p>
                ) : null}
              </article>
            );
          })}
        </section>
        </div>
      </AdminGate>
    </Layout>
  );
}
