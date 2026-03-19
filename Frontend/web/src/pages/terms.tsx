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

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">{t('terms.title')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('terms.lastUpdated')}</p>
        <p className="text-gray-700 mb-10 leading-relaxed">{t('terms.intro')}</p>

        <div className="space-y-10">
          {SECTIONS.map((key) => (
            <section key={key}>
              <h2 className="text-xl font-semibold mb-3">
                {t(`terms.sections.${key}.title`)}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t(`terms.sections.${key}.content`)}
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
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}
