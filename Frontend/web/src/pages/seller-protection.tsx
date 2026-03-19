import Layout from '@/components/Layout';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Flag, Lock, ShieldAlert, Headphones, CheckCircle } from 'lucide-react';

const SECTIONS = [
  { key: 'reporting', Icon: Flag },
  { key: 'privacy', Icon: Lock },
  { key: 'fraud', Icon: ShieldAlert },
  { key: 'support', Icon: Headphones },
] as const;

const TIP_ITEMS = ['verify', 'platform', 'meet', 'report'] as const;

export default function SellerProtection() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <Head>
        <title>{t('sellerProtection.pageTitle')}</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('sellerProtection.title')}
          </h1>
          <p className="text-gray-600 mb-8">
            {t('sellerProtection.subtitle')}
          </p>

          {/* 2x2 Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {SECTIONS.map(({ key, Icon }) => (
              <div
                key={key}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t(`sellerProtection.sections.${key}.title`)}
                  </h2>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {t(`sellerProtection.sections.${key}.content`)}
                </p>
              </div>
            ))}
          </div>

          {/* Tips Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('sellerProtection.tips.title')}
            </h2>
            <ul className="space-y-3">
              {TIP_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    {t(`sellerProtection.tips.items.${item}`)}
                  </span>
                </li>
              ))}
            </ul>
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
