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

      <div className="info-page">
        <div className="info-shell max-w-4xl">
          <section className="info-hero">
            <span className="info-kicker">{t('footer.sellerGuide')}</span>
            <h1 className="info-title">
            {t('sellerGuide.title')}
          </h1>
            <p className="info-subtitle">{t('sellerGuide.subtitle')}</p>
          </section>

          <div className="space-y-4">
            {SECTIONS.map((key, index) => (
              <div key={key} className="info-card flex gap-4">
                <div className="info-step-number">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h2 className="mb-2 text-xl font-semibold text-slate-950">
                    {t(`sellerGuide.sections.${key}.title`)}
                  </h2>
                  <p className="leading-7 text-slate-600">
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
