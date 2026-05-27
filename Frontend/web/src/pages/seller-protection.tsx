import Layout from '@/components/Layout';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Flag, Lock, ShieldAlert, Headphones, CheckCircle } from 'lucide-react';

const SECTIONS = [
  { key: 'reporting', Icon: Flag },
  { key: 'privacy', Icon: Lock },
  { key: 'fraud', Icon: ShieldAlert },
  { key: 'support', Icon: Headphones },
] as const;

const TIP_ITEMS = ['verify', 'platform', 'meet', 'report'] as const;

export default function SellerProtection() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <Head>
        <title>{t('sellerProtection.pageTitle')}</title>
      </Head>

      <div className="info-page">
        <div className="info-shell max-w-4xl">
          <section className="info-hero">
            <span className="info-kicker">{t('footer.sellerProtection')}</span>
            <h1 className="info-title">
            {t('sellerProtection.title')}
          </h1>
            <p className="info-subtitle">
            {t('sellerProtection.subtitle')}
          </p>
          </section>

          <div className="mb-8 grid gap-5 md:grid-cols-2">
            {SECTIONS.map(({ key, Icon }) => (
              <div
                key={key}
                className="info-card"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="info-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    {t(`sellerProtection.sections.${key}.title`)}
                  </h2>
                </div>
                <p className="leading-7 text-slate-600">
                  {t(`sellerProtection.sections.${key}.content`)}
                </p>
              </div>
            ))}
          </div>

          <div className="info-muted-panel">
            <h2 className="mb-4 text-xl font-semibold text-slate-950">
              {t('sellerProtection.tips.title')}
            </h2>
            <ul className="space-y-3">
              {TIP_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="info-list-check" />
                  <span className="leading-6 text-slate-700">
                    {t(`sellerProtection.tips.items.${item}`)}
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
