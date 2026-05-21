import { FormEvent, useMemo, useState } from 'react';
import { Bug, Loader2, Send, X } from 'lucide-react';
import { createBugReport, type BugReportSeverity } from '@/lib/api/bugReports';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    brands?: Array<{ brand: string; version: string }>;
  };
};

const initialForm = {
  title: '',
  description: '',
  steps: '',
  expected: '',
  actual: '',
  severity: 'medium' as BugReportSeverity,
};

export default function BugReportButton() {
  const { isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);

  const browser = useMemo(() => {
    if (typeof navigator === 'undefined') return undefined;
    const brands = (navigator as NavigatorWithUserAgentData).userAgentData?.brands;
    return brands?.map((brand) => `${brand.brand} ${brand.version}`).join(', ');
  }, []);

  const openDialog = () => {
    if (!isAuthenticated) {
      const redirect = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
      window.location.href = `/auth/login?redirect=${encodeURIComponent(redirect)}`;
      return;
    }
    setIsOpen(true);
  };

  const closeDialog = () => {
    if (!isSubmitting) setIsOpen(false);
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await createBugReport({
        title: form.title,
        description: form.description,
        steps: form.steps || undefined,
        expected: form.expected || undefined,
        actual: form.actual || undefined,
        severity: form.severity,
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        browser,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });
      toast.success(`Bug report sent. Reference: ${result.id.slice(0, 8)}`);
      setForm(initialForm);
      setIsOpen(false);
    } catch {
      toast.error('Unable to send bug report right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="fixed bottom-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-950/20 transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label="Report a bug"
        title="Report a bug"
      >
        <Bug className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
          <form
            onSubmit={submit}
            className="w-full max-w-lg rounded-lg bg-white shadow-2xl shadow-slate-950/20"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-950">Report a bug</h2>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Title</span>
                <input
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  maxLength={120}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="What broke?"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  maxLength={5000}
                  required
                  rows={4}
                  className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder="Tell us what happened."
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Severity</span>
                <select
                  value={form.severity}
                  onChange={(event) => updateField('severity', event.target.value as BugReportSeverity)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Steps to reproduce</span>
                <textarea
                  value={form.steps}
                  onChange={(event) => updateField('steps', event.target.value)}
                  maxLength={3000}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">Expected</span>
                  <textarea
                    value={form.expected}
                    onChange={(event) => updateField('expected', event.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">Actual</span>
                  <textarea
                    value={form.actual}
                    onChange={(event) => updateField('actual', event.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isSubmitting}
                className="rounded-md px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send report
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
