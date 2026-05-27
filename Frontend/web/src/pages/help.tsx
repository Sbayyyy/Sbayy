import Layout from '@/components/Layout';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ChevronDown, HelpCircle } from 'lucide-react';

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

      <div className="info-page">
        <div className="info-shell max-w-3xl">
          <div className="info-hero">
            <span className="info-kicker">
              <HelpCircle className="h-4 w-4" />
              {t('footer.helpCenter')}
            </span>
            <h1 className="info-title">{t('help.title')}</h1>
            <p className="info-subtitle">{t('help.subtitle')}</p>
          </div>

          <div className="space-y-3">
            {faqKeys.map((key, index) => (
              <div
                key={key}
                className="surface-card overflow-hidden"
              >
                <button
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start transition-colors hover:bg-slate-50"
                >
                  <span className="font-semibold text-slate-950">
                    {t(`help.faq.${key}.question`)}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <div className="px-5 pb-5 leading-7 text-slate-600">
                    {t(`help.faq.${key}.answer`)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="info-panel mt-10 text-center">
            <h2 className="mb-4 text-xl font-bold text-slate-950">
              {t('help.stillNeedHelp')}
            </h2>
            <Link
              href="/contact"
              className="btn btn-primary"
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
