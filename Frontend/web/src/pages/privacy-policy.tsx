import Head from 'next/head';
import Layout from '@/components/Layout';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const SECTIONS = [
  'collection',
  'usage',
  'sharing',
  'security',
  'cookies',
  'retention',
  'rights',
  'deletion',
  'children',
  'changes',
  'contact',
] as const;

export default function Privacy() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <Head>
        <title>{t('privacy.pageTitle')}</title>
        <meta name="description" content={t('privacy.intro')} />
      </Head>

      <div className="info-page">
        <div className="info-shell max-w-4xl">
          <section className="info-hero text-start">
            <span className="info-kicker">{t('footer.privacyPolicy')}</span>
            <h1 className="info-title">{t('privacy.title')}</h1>
            <p className="mt-3 text-sm font-semibold text-slate-500">{t('privacy.lastUpdated')}</p>
            <p className="info-subtitle mx-0">{t('privacy.intro')}</p>
          </section>

          <div className="space-y-4">
            {SECTIONS.map((key) => (
              <section key={key} className="info-card">
                <h2 className="mb-3 text-xl font-semibold text-slate-950">
                  {t(`privacy.sections.${key}.title`)}
                </h2>
                <p className="leading-7 text-slate-700">
                  {t(`privacy.sections.${key}.content`)}
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
      ...(await serverSideTranslations(locale ?? 'ar', ['common'])),
    },
  };
}
