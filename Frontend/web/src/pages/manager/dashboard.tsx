import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { getAdminDashboardSummary, type AdminDashboardSummary } from '@/lib/api/adminDashboard';
import AdminGate from '@/components/manager/AdminGate';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import {
  Users,
  Package,
  MessageSquare,
  Flag,
  ShoppingCart,
  Bell,
  BarChart3,
  Bug,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';

type DashboardSection = {
  key: keyof AdminDashboardSummary;
  title: string;
  primary: string;
  rows: string[];
  icon: LucideIcon;
  accent: string;
};

const sections: DashboardSection[] = [
  { key: 'users', title: 'Users', primary: 'total', rows: ['active', 'blocked', 'deactivated', 'admins', 'sellers', 'unverified'], icon: Users, accent: 'bg-primary-50 text-primary-600' },
  { key: 'listings', title: 'Listings', primary: 'total', rows: ['active', 'sold', 'hidden', 'deleted'], icon: Package, accent: 'bg-emerald-50 text-emerald-600' },
  { key: 'chats', title: 'Chats', primary: 'total', rows: ['messages', 'unreadMessages'], icon: MessageSquare, accent: 'bg-violet-50 text-violet-600' },
  { key: 'reports', title: 'Reports', primary: 'total', rows: ['open', 'reviewed', 'closed'], icon: Flag, accent: 'bg-amber-50 text-amber-600' },
  { key: 'orders', title: 'Orders', primary: 'total', rows: ['pending', 'paid', 'shipped', 'completed', 'cancelled'], icon: ShoppingCart, accent: 'bg-sky-50 text-sky-600' },
  { key: 'notifications', title: 'Notifications', primary: 'total', rows: ['unread'], icon: Bell, accent: 'bg-indigo-50 text-indigo-600' },
  { key: 'commerce', title: 'Commerce', primary: 'reviews', rows: ['favorites', 'payments', 'sponsoredAds', 'activeSponsoredAds'], icon: BarChart3, accent: 'bg-teal-50 text-teal-600' },
  { key: 'bugReports', title: 'Bug Reports', primary: 'total', rows: ['stored'], icon: Bug, accent: 'bg-rose-50 text-rose-600' },
];

const quickLinks = [
  { href: '/manager/users', label: 'Manage users' },
  { href: '/manager/listings', label: 'Manage listings' },
  { href: '/manager/chats', label: 'Moderate chats' },
  { href: '/manager/reports', label: 'Moderate reports' },
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
        <div className="app-page">
          <div className="container mx-auto px-4 py-8">
            <div className="surface-card p-6 sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="page-kicker">Managers</p>
                  <h1 className="page-title mt-1">Operations dashboard</h1>
                  <p className="page-subtitle">
                    Live platform totals for users, listings, chats, reports, orders, notifications, and commerce.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadSummary}
                  disabled={isLoading}
                  className="btn btn-primary self-start lg:self-auto"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Refreshing' : 'Refresh'}
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {quickLinks.map(link => (
                  <Link key={link.href} href={link.href} className="btn btn-outline">
                    {link.label}
                  </Link>
                ))}
              </div>

              {generatedAt ? (
                <p className="mt-4 text-sm text-slate-500">Last refreshed {generatedAt}</p>
              ) : null}
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            {isLoading && !summary ? (
              <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="surface-card p-5">
                    <div className="skeleton h-11 w-11 rounded-2xl" />
                    <div className="skeleton mt-4 h-9 w-24" />
                    <div className="skeleton mt-4 h-4 w-full" />
                    <div className="skeleton mt-2 h-4 w-2/3" />
                  </div>
                ))}
              </section>
            ) : (
              <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {sections.map(section => {
                  const data = summary?.[section.key] as Record<string, unknown> | undefined;
                  const Icon = section.icon;
                  return (
                    <article key={section.key} className="surface-card surface-card-hover p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-sm font-semibold text-slate-500">{section.title}</h2>
                          <div className="mt-2 text-3xl font-bold tabular-nums text-slate-950">
                            {formatValue(data?.[section.primary])}
                          </div>
                        </div>
                        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${section.accent}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>
                      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 text-sm">
                        {section.rows.map(row => (
                          <div key={row} className="min-w-0">
                            <dt className="truncate text-slate-500">{labelFor(row)}</dt>
                            <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{formatValue(data?.[row])}</dd>
                          </div>
                        ))}
                      </dl>
                      {section.key === 'bugReports' && typeof data?.note === 'string' ? (
                        <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">{data.note}</p>
                      ) : null}
                    </article>
                  );
                })}
              </section>
            )}
          </div>
        </div>
      </AdminGate>
    </Layout>
  );
}
