import Head from 'next/head';
import Layout from '@/components/Layout';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const DATA_ITEMS = [
  'account',
  'listings',
  'images',
  'messages',
  'personal',
] as const;

export default function DeleteAccountPage() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <Head>
        <title>{t('deleteAccount.pageTitle')}</title>
        <meta name="description" content={t('deleteAccount.intro')} />
      </Head>

      <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
        <section className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">{t('deleteAccount.title')}</h1>

          <p className="mt-6">{t('deleteAccount.intro')}</p>

          <p className="mt-4 text-lg font-semibold">
            <a
              href="mailto:support@syrian-bay.com"
              className="text-blue-700 underline"
            >
              support@syrian-bay.com
            </a>
          </p>

          <p className="mt-6">{t('deleteAccount.verification')}</p>

          <h2 className="mt-8 text-xl font-semibold">
            {t('deleteAccount.dataTitle')}
          </h2>

          <ul className="mt-4 list-disc space-y-2 pl-6">
            {DATA_ITEMS.map((key) => (
              <li key={key}>{t(`deleteAccount.data.${key}`)}</li>
            ))}
          </ul>

          <h2 className="mt-8 text-xl font-semibold">
            {t('deleteAccount.retentionTitle')}
          </h2>

          <p className="mt-4">{t('deleteAccount.retention')}</p>

          <p className="mt-6">{t('deleteAccount.processingTime')}</p>
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