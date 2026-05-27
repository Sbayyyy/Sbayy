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

      <div className="info-page">
        <div className="info-shell max-w-4xl">
          <section className="info-hero">
            <span className="info-kicker">{t('footer.feesAndCommissions')}</span>
            <h1 className="info-title">
            {t('fees.title')}
          </h1>
            <p className="info-subtitle">{t('fees.subtitle')}</p>
          </section>

          <div className="mb-8 grid gap-5 md:grid-cols-2">
            <div className="surface-card border-emerald-200 bg-emerald-50/60 p-6">
              <h2 className="mb-4 text-xl font-semibold text-emerald-800">
                {t('fees.free.title')}
              </h2>
              <ul className="space-y-3">
                {FREE_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <span className="leading-6 text-slate-700">
                      {t(`fees.free.items.${item}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="surface-card border-primary-200 bg-primary-50/60 p-6">
              <h2 className="mb-2 text-xl font-semibold text-primary-800">
                {t('fees.premium.title')}
              </h2>
              <p className="mb-4 text-sm leading-6 text-slate-600">
                {t('fees.premium.description')}
              </p>
              <ul className="space-y-3">
                {PREMIUM_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600" />
                    <span className="leading-6 text-slate-700">
                      {t(`fees.premium.items.${item}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="info-muted-panel text-sm leading-6 text-slate-600">
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
