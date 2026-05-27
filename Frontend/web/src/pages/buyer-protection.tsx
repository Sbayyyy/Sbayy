import Layout from '@/components/Layout';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CheckCircle, Headphones, MessageCircle, SearchCheck, ShieldCheck } from 'lucide-react';

const SECTIONS = [
  { key: 'verifiedListings', Icon: SearchCheck },
  { key: 'secureMessaging', Icon: MessageCircle },
  { key: 'fraudPrevention', Icon: ShieldCheck },
  { key: 'support', Icon: Headphones },
] as const;

const TIP_ITEMS = ['profile', 'messages', 'payment', 'meet', 'report'] as const;

export default function BuyerProtection() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <Head>
        <title>{t('buyerProtection.pageTitle')}</title>
        <meta name="description" content={t('buyerProtection.subtitle')} />
      </Head>

      <div className="info-page">
        <div className="info-shell max-w-4xl">
          <section className="info-hero">
            <span className="info-kicker">{t('footer.buyerProtection')}</span>
            <h1 className="info-title">
            {t('buyerProtection.title')}
          </h1>
            <p className="info-subtitle">
            {t('buyerProtection.subtitle')}
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
                    {t(`buyerProtection.sections.${key}.title`)}
                  </h2>
                </div>
                <p className="leading-7 text-slate-600">
                  {t(`buyerProtection.sections.${key}.content`)}
                </p>
              </div>
            ))}
          </div>

          <div className="info-muted-panel">
            <h2 className="mb-4 text-xl font-semibold text-slate-950">
              {t('buyerProtection.tips.title')}
            </h2>
            <ul className="space-y-3">
              {TIP_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="info-list-check" />
                  <span className="leading-6 text-slate-700">
                    {t(`buyerProtection.tips.items.${item}`)}
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
