import Layout from '@/components/Layout';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CheckCircle, Headphones, MessageCircle, SearchCheck, ShieldCheck } from 'lucide-react';

const SECTIONS = [
  { key: 'verifiedListings', Icon: SearchCheck },
  { key: 'secureMessaging', Icon: MessageCircle },
  { key: 'fraudPrevention', Icon: ShieldCheck },
  { key: 'support', Icon: Headphones },
] as const;

const TIP_ITEMS = ['profile', 'messages', 'payment', 'meet', 'report'] as const;

export default function BuyerProtection() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <Head>
        <title>{t('buyerProtection.pageTitle')}</title>
        <meta name="description" content={t('buyerProtection.subtitle')} />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('buyerProtection.title')}
          </h1>
          <p className="text-gray-600 mb-8">
            {t('buyerProtection.subtitle')}
          </p>

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
                    {t(`buyerProtection.sections.${key}.title`)}
                  </h2>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {t(`buyerProtection.sections.${key}.content`)}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('buyerProtection.tips.title')}
            </h2>
            <ul className="space-y-3">
              {TIP_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    {t(`buyerProtection.tips.items.${item}`)}
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
