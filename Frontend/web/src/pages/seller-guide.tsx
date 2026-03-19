import Layout from '@/components/Layout';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const SECTIONS = [
  'gettingStarted',
  'createListing',
  'communication',
  'shipping',
  'tips',
] as const;

export default function SellerGuide() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <Head>
        <title>{t('sellerGuide.pageTitle')}</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('sellerGuide.title')}
          </h1>
          <p className="text-gray-600 mb-8">{t('sellerGuide.subtitle')}</p>

          <div className="space-y-8">
            {SECTIONS.map((key, index) => (
              <div key={key} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>
                <div className="flex-1 border-l-4 border-primary-500 pl-4">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {t(`sellerGuide.sections.${key}.title`)}
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    {t(`sellerGuide.sections.${key}.content`)}
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
