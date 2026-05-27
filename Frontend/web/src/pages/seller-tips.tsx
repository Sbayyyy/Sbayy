import Layout from '@/components/Layout';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Camera, FileText, DollarSign, Zap, Star } from 'lucide-react';

const SECTIONS = [
  { key: 'photos', Icon: Camera },
  { key: 'description', Icon: FileText },
  { key: 'pricing', Icon: DollarSign },
  { key: 'response', Icon: Zap },
  { key: 'reputation', Icon: Star },
] as const;

export default function SellerTips() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <Head>
        <title>{t('sellerTips.pageTitle')}</title>
      </Head>

      <div className="info-page">
        <div className="info-shell max-w-4xl">
          <section className="info-hero">
            <span className="info-kicker">{t('footer.sellingTips')}</span>
            <h1 className="info-title">
            {t('sellerTips.title')}
          </h1>
            <p className="info-subtitle">{t('sellerTips.subtitle')}</p>
          </section>

          <div className="space-y-4">
            {SECTIONS.map(({ key, Icon }) => (
              <div
                key={key}
                className="info-card flex items-start gap-4"
              >
                <div className="info-icon">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="mb-2 text-lg font-semibold text-slate-950">
                    {t(`sellerTips.sections.${key}.title`)}
                  </h2>
                  <p className="leading-7 text-slate-600">
                    {t(`sellerTips.sections.${key}.content`)}
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
