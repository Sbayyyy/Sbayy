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

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">{t('privacy.title')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('privacy.lastUpdated')}</p>
        <p className="text-gray-700 mb-10 leading-relaxed">{t('privacy.intro')}</p>

        <div className="space-y-10">
          {SECTIONS.map((key) => (
            <section key={key}>
              <h2 className="text-xl font-semibold mb-3">
                {t(`privacy.sections.${key}.title`)}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t(`privacy.sections.${key}.content`)}
              </p>
            </section>
          ))}
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