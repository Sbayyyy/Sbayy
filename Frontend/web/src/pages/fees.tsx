import Layout from '@/components/Layout';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Check, Sparkles } from 'lucide-react';

const FREE_ITEMS = ['registration', 'listing', 'messaging', 'browsing'] as const;
const PREMIUM_ITEMS = ['featured', 'analytics', 'verified'] as const;

export default function Fees() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <Head>
        <title>{t('fees.pageTitle')}</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('fees.title')}
          </h1>
          <p className="text-gray-600 mb-8">{t('fees.subtitle')}</p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Free Services Card */}
            <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
              <h2 className="text-xl font-semibold text-green-800 mb-4">
                {t('fees.free.title')}
              </h2>
              <ul className="space-y-3">
                {FREE_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {t(`fees.free.items.${item}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium Card */}
            <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
              <h2 className="text-xl font-semibold text-blue-800 mb-2">
                {t('fees.premium.title')}
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                {t('fees.premium.description')}
              </p>
              <ul className="space-y-3">
                {PREMIUM_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {t(`fees.premium.items.${item}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Note */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
            {t('fees.note')}
          </div>
        </div>
      </div>
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
