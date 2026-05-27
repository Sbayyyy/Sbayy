import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { requestAccountDeletion } from '@/lib/api/users';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useRequireAuth } from '@/lib/useRequireAuth';

const DATA_ITEMS = [
  'account',
  'listings',
  'images',
  'messages',
  'personal',
] as const;

export default function DeleteAccountPage() {
  useRequireAuth();
  const { t } = useTranslation('common');
  const router = useRouter();
  const { logout } = useAuthStore();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestDeletion = async () => {
    const confirmed = window.confirm(t('deleteAccount.confirm', 'Request account deletion? Your account will be deactivated immediately.'));
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const result = await requestAccountDeletion(reason);
      logout();
      toast.success(
        t('deleteAccount.success', {
          defaultValue: 'Deletion requested. Scheduled deletion: {{date}}',
          date: new Date(result.scheduledDeletionAt).toLocaleDateString()
        })
      );
      void router.push('/');
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      toast.error(t('deleteAccount.error', 'Unable to request account deletion'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>{t('deleteAccount.pageTitle')}</title>
        <meta name="description" content={t('deleteAccount.intro')} />
      </Head>

      <main className="info-page">
        <section className="info-shell max-w-3xl">
          <div className="info-panel">
          <span className="info-kicker">{t('deleteAccount.title')}</span>
          <h1 className="info-title">{t('deleteAccount.title')}</h1>

          <p className="mt-6 leading-7 text-slate-700">{t('deleteAccount.intro')}</p>

          <p className="mt-4 text-lg font-semibold">
            <a
              href="mailto:support@syrian-bay.com"
              className="text-primary-700 underline"
            >
              support@syrian-bay.com
            </a>
          </p>

          <p className="mt-6 leading-7 text-slate-700">{t('deleteAccount.verification')}</p>

          <h2 className="mt-8 text-xl font-semibold text-slate-950">
            {t('deleteAccount.dataTitle')}
          </h2>

          <ul className="mt-4 space-y-2">
            {DATA_ITEMS.map((key) => (
              <li key={key} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 text-slate-700">
                {t(`deleteAccount.data.${key}`)}
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-xl font-semibold text-slate-950">
            {t('deleteAccount.retentionTitle')}
          </h2>

          <p className="mt-4 leading-7 text-slate-700">{t('deleteAccount.retention')}</p>

          <p className="mt-6 leading-7 text-slate-700">{t('deleteAccount.processingTime')}</p>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <label htmlFor="deletionReason" className="block text-sm font-semibold text-slate-700">
              {t('deleteAccount.reasonLabel', 'Reason for deletion (optional)')}
            </label>
            <textarea
              id="deletionReason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              className="input mt-2 min-h-24 resize-none text-sm"
              placeholder={t('deleteAccount.reasonPlaceholder', 'Tell us why you are deleting your account')}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleRequestDeletion}
                disabled={isSubmitting}
                className="btn btn-danger"
              >
                {isSubmitting
                  ? t('deleteAccount.requesting', 'Requesting...')
                  : t('deleteAccount.requestButton', 'Request account deletion')}
              </button>
            </div>
          </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common'])),
    },
  };
}
