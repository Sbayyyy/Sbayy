import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import AdminGate from '@/components/manager/AdminGate';
import {
  getAdminReports,
  updateAdminReport,
  reportActionLabel,
  reportReasonLabel,
  reportStatusLabel,
  reportTargetTypeLabel,
  REPORT_ACTIONS,
  REPORT_STATUSES,
  type AdminReport,
} from '@/lib/api/adminReports';
import { useAuthStore } from '@/lib/store';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function statusBadgeClass(status: number) {
  switch (status) {
    case 0: return 'bg-amber-50 text-amber-700 border-amber-200'; // Open
    case 1: return 'bg-blue-50 text-blue-700 border-blue-200'; // Reviewed
    default: return 'bg-gray-100 text-gray-600 border-gray-200'; // Closed
  }
}

export default function ManagerReportsPage() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setIsLoading(true);
    setError(null);
    try {
      setReports(await getAdminReports({ status: status || undefined, take: 100 }));
    } catch {
      setError('Could not load reports.');
    } finally {
      setIsLoading(false);
    }
  }, [status, user?.role]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function applyUpdate(report: AdminReport, payload: { status?: string; action?: string; adminNotes?: string }) {
    setSavingId(report.id);
    setError(null);
    try {
      const updated = await updateAdminReport(report.id, payload);
      setReports(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    } catch {
      setError('Could not update the report. Make sure your admin session is still valid.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Layout title="Moderate Reports">
      <AdminGate>
        <div className="py-8">
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-blue-700">Managers</p>
              <h1 className="mt-2 text-3xl font-semibold text-gray-950">Reports</h1>
              <p className="mt-2 text-sm text-gray-600">Triage user reports, record actions, and resolve cases.</p>
            </div>
            <Link href="/manager/dashboard" className="text-sm font-semibold text-blue-700 hover:underline">
              Back to dashboard
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row">
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All statuses</option>
              {REPORT_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadReports}
              disabled={isLoading}
              className="h-10 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-gray-400"
            >
              {isLoading ? 'Loading' : 'Refresh'}
            </button>
          </div>

          {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

          <div className="mt-6 space-y-4">
            {reports.map(report => (
              <article key={report.id} className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(report.status)}`}>
                        {reportStatusLabel(report.status)}
                      </span>
                      <span className="text-sm font-semibold text-gray-950">{reportReasonLabel(report.reason)}</span>
                      <span className="text-xs text-gray-500">
                        on {reportTargetTypeLabel(report.targetType)} · {formatDateTime(report.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      {report.description || <span className="text-gray-400">No description provided.</span>}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Target ID: {report.targetId}
                      {report.reportedUserId ? ` · Reported user: ${report.reportedUserId}` : ''}
                    </div>
                    {report.evidenceUrls.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {report.evidenceUrls.map((url, i) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                            Evidence {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      Action taken: <span className="font-semibold text-gray-700">{reportActionLabel(report.action)}</span>
                      {report.adminNotes ? ` · Notes: ${report.adminNotes}` : ''}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                  <label className="text-xs font-semibold text-gray-500">Action</label>
                  <select
                    value={REPORT_ACTIONS[report.action] ?? 'None'}
                    onChange={e => applyUpdate(report, { action: e.target.value })}
                    disabled={savingId === report.id}
                    className="h-9 rounded-md border border-gray-300 px-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {REPORT_ACTIONS.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>

                  {report.status !== 1 && (
                    <button
                      type="button"
                      onClick={() => applyUpdate(report, { status: 'Reviewed' })}
                      disabled={savingId === report.id}
                      className="rounded-md border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      Mark reviewed
                    </button>
                  )}
                  {report.status !== 2 && (
                    <button
                      type="button"
                      onClick={() => applyUpdate(report, { status: 'Closed' })}
                      disabled={savingId === report.id}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Close
                    </button>
                  )}
                </div>
              </article>
            ))}
            {reports.length === 0 && (
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
                No reports found.
              </div>
            )}
          </div>
        </div>
      </AdminGate>
    </Layout>
  );
}
