import Layout from '@/components/Layout';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ChevronDown, Search, HelpCircle } from 'lucide-react';

const faqKeys = [
  'createAccount',
  'resetPassword',
  'howToBuy',
  'howToSell',
  'isSafe',
  'reportUser',
  'editListing',
  'contactSupport',
];

export default function HelpPage() {
  const { t } = useTranslation('common');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Layout title={t('help.pageTitle')}>
      <Head>
        <title>{t('help.pageTitle')}</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Page Header */}
          <div className="text-center mb-8">
            <HelpCircle className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">{t('help.title')}</h1>
            <p className="mt-2 text-gray-600">{t('help.subtitle')}</p>
          </div>

          {/* FAQ Accordion */}
          <div className="space-y-3">
            {faqKeys.map((key, index) => (
              <div
                key={key}
                className="bg-white rounded-lg shadow-sm border"
              >
                <button
                  onClick={() => toggle(index)}
                  className="w-full flex items-center justify-between px-5 py-4 text-right"
                >
                  <span className="font-medium text-gray-900">
                    {t(`help.faq.${key}.question`)}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <div className="px-5 pb-4 text-gray-600">
                    {t(`help.faq.${key}.answer`)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Still Need Help */}
          <div className="mt-12 text-center bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t('help.stillNeedHelp')}
            </h2>
            <Link
              href="/contact"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              {t('help.contactSupport')}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}
