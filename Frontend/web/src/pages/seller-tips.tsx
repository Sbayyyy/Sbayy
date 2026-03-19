import Layout from '@/components/Layout';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Camera, FileText, DollarSign, Zap, Star } from 'lucide-react';

const SECTIONS = [
  { key: 'photos', Icon: Camera },
  { key: 'description', Icon: FileText },
  { key: 'pricing', Icon: DollarSign },
  { key: 'response', Icon: Zap },
  { key: 'reputation', Icon: Star },
] as const;

export default function SellerTips() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <Head>
        <title>{t('sellerTips.pageTitle')}</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('sellerTips.title')}
          </h1>
          <p className="text-gray-600 mb-8">{t('sellerTips.subtitle')}</p>

          <div className="space-y-6">
            {SECTIONS.map(({ key, Icon }) => (
              <div
                key={key}
                className="border border-gray-200 rounded-lg p-6 flex gap-4 items-start hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    {t(`sellerTips.sections.${key}.title`)}
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    {t(`sellerTips.sections.${key}.content`)}
                  </p>
                </div>
              </div>
            ))}
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
