import Head from 'next/head';
import Layout from '@/components/Layout';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const SECTIONS = [
  'general',
  'accounts',
  'listings',
  'transactions',
  'prohibited',
  'liability',
  'intellectual',
  'changes',
] as const;

export default function Terms() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <Head>
        <title>{t('terms.pageTitle')}</title>
      </Head>

      <div className="info-page">
        <div className="info-shell max-w-4xl">
          <section className="info-hero text-start">
            <span className="info-kicker">{t('footer.termsAndConditions')}</span>
            <h1 className="info-title">{t('terms.title')}</h1>
            <p className="mt-3 text-sm font-semibold text-slate-500">{t('terms.lastUpdated')}</p>
            <p className="info-subtitle mx-0">{t('terms.intro')}</p>
          </section>

          <div className="space-y-4">
            {SECTIONS.map((key) => (
              <section key={key} className="info-card">
                <h2 className="mb-3 text-xl font-semibold text-slate-950">
                  {t(`terms.sections.${key}.title`)}
                </h2>
                <p className="leading-7 text-slate-700">
                  {t(`terms.sections.${key}.content`)}
                </p>
              </section>
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
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}
