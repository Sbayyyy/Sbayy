import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import AdminGate from '@/components/manager/AdminGate';
import { getClientLogs, getClientLogSummary, type ClientLog, type ClientLogSummary } from '@/lib/api/clientLogs';
import { useAuthStore } from '@/lib/store';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';

const levels = ['', 'critical', 'error', 'warning', 'info', 'debug'];

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function levelClass(level: string) {
  switch (level) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'error':
      return 'bg-rose-100 text-rose-800';
    case 'warning':
      return 'bg-amber-100 text-amber-800';
    case 'info':
      return 'bg-sky-100 text-sky-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function ManagerLogsPage() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<ClientLog[]>([]);
  const [summary, setSummary] = useState<ClientLogSummary | null>(null);
  const [level, setLevel] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [page, nextSummary] = await Promise.all([
        getClientLogs({ level: level || undefined, source: source || undefined, search: search || undefined, limit: 50 }),
        getClientLogSummary(),
      ]);
      setLogs(page.items);
      setSummary(nextSummary);
    } catch {
      setError('Could not load client logs. Make sure your account has admin access.');
    } finally {
      setIsLoading(false);
    }
  }, [level, search, source]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    void load();
  }, [load, user?.role]);

  const sourceOptions = useMemo(() => {
    const sources = new Set(summary?.sources.map(item => item.source) ?? []);
    logs.forEach(log => sources.add(log.source));
    return Array.from(sources).sort();
  }, [logs, summary?.sources]);

  return (
    <Layout title="Client logs">
      <AdminGate>
        <div className="app-page">
          <div className="container mx-auto px-4 py-8">
            <div className="surface-card p-6 sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="page-kicker">Managers</p>
                  <h1 className="page-title mt-1">Client logs</h1>
                  <p className="page-subtitle">
                    Search mobile and web crash logs, unhandled promise rejections, and handled developer reports.
                  </p>
                </div>
                <button type="button" onClick={load} disabled={isLoading} className="btn btn-primary self-start lg:self-auto">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Refreshing' : 'Refresh'}
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
                {[
                  ['Total', summary?.total],
                  ['Last 24h', summary?.last24Hours],
                  ['Critical', summary?.critical],
                  ['Errors', summary?.errors],
                  ['Warnings', summary?.warnings],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-slate-950">
                      {typeof value === 'number' ? value.toLocaleString() : '-'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-[1fr_160px_180px_auto]">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    className="input pl-9"
                    placeholder="Search message, exception, or URL"
                  />
                </label>
                <select value={level} onChange={event => setLevel(event.target.value)} className="input">
                  {levels.map(item => (
                    <option key={item || 'all'} value={item}>{item ? item : 'All levels'}</option>
                  ))}
                </select>
                <select value={source} onChange={event => setSource(event.target.value)} className="input">
                  <option value="">All sources</option>
                  {sourceOptions.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <button type="button" onClick={load} className="btn btn-secondary">Apply</button>
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <section className="mt-6 space-y-3">
              {logs.map(log => {
                const expanded = expandedId === log.id;
                return (
                  <article key={log.id} className="surface-card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : log.id)}
                      className="flex w-full flex-col gap-3 p-5 text-left md:flex-row md:items-start md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${levelClass(log.level)}`}>
                            {log.level}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {log.source}
                          </span>
                          {log.exceptionType ? (
                            <span className="text-xs font-medium text-slate-500">{log.exceptionType}</span>
                          ) : null}
                        </div>
                        <h2 className="mt-3 line-clamp-2 font-semibold text-slate-950">{log.message}</h2>
                        <p className="mt-1 truncate text-sm text-slate-500">{log.url || log.platform || log.userAgent || 'No URL or device metadata'}</p>
                      </div>
                      <div className="flex-shrink-0 text-sm text-slate-500">{formatDate(log.createdAt)}</div>
                    </button>
                    {expanded ? (
                      <div className="border-t border-slate-100 bg-slate-50 p-5">
                        <dl className="grid gap-3 text-sm md:grid-cols-2">
                          <div><dt className="font-semibold text-slate-500">User</dt><dd className="break-all text-slate-900">{log.userId ?? 'Anonymous'}</dd></div>
                          <div><dt className="font-semibold text-slate-500">Request</dt><dd className="break-all text-slate-900">{log.requestId ?? '-'}</dd></div>
                          <div><dt className="font-semibold text-slate-500">Platform</dt><dd className="break-all text-slate-900">{log.platform ?? '-'}</dd></div>
                          <div><dt className="font-semibold text-slate-500">Version</dt><dd className="break-all text-slate-900">{log.appVersion ?? '-'}</dd></div>
                        </dl>
                        {log.contextJson ? (
                          <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-white p-4 text-xs text-slate-800">{log.contextJson}</pre>
                        ) : null}
                        {log.stackTrace ? (
                          <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{log.stackTrace}</pre>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}

              {!isLoading && logs.length === 0 ? (
                <div className="surface-card flex items-center gap-3 p-6 text-slate-600">
                  <AlertTriangle className="h-5 w-5" />
                  No client logs matched the current filters.
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </AdminGate>
    </Layout>
  );
}
