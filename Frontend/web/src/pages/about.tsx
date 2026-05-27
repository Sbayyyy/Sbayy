import Layout from '@/components/Layout';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Shield, Zap, Users, Lightbulb } from 'lucide-react';

const VALUES = [
  { icon: Shield, titleKey: 'about.values.trust', descKey: 'about.values.trustDesc' },
  { icon: Zap, titleKey: 'about.values.simplicity', descKey: 'about.values.simplicityDesc' },
  { icon: Users, titleKey: 'about.values.community', descKey: 'about.values.communityDesc' },
  { icon: Lightbulb, titleKey: 'about.values.innovation', descKey: 'about.values.innovationDesc' },
];

const STATS = [
  { value: '1000+', labelKey: 'about.stats.users' },
  { value: '500+', labelKey: 'about.stats.listings' },
  { value: '14', labelKey: 'about.stats.cities' },
  { value: '2000+', labelKey: 'about.stats.transactions' },
];

export default function AboutPage() {
  const { t } = useTranslation('common');

  return (
    <Layout title={t('about.pageTitle')}>
      <Head>
        <meta name="description" content={t('about.subtitle')} />
      </Head>

      <div className="info-page">
        <div className="info-shell space-y-10">
          <section className="info-hero">
            <span className="info-kicker">{t('footer.aboutSbay')}</span>
            <h1 className="info-title">
              {t('about.title')}
            </h1>
            <p className="mt-3 text-base font-semibold text-primary-700">
              {t('about.subtitle')}
            </p>
            <p className="info-subtitle">
              {t('about.description')}
            </p>
          </section>

          <section className="info-panel">
            <h2 className="section-heading mb-4">
              {t('about.mission.title')}
            </h2>
            <p className="leading-7 text-slate-600">
              {t('about.mission.content')}
            </p>
          </section>

          <section>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {VALUES.map(({ icon: Icon, titleKey, descKey }) => (
                <div
                  key={titleKey}
                  className="info-card flex items-start gap-4"
                >
                  <div className="info-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-semibold text-slate-950">
                      {t(titleKey)}
                    </h3>
                    <p className="text-sm leading-6 text-slate-600">
                      {t(descKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-slate-950 p-6 sm:p-8">
            <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
              {STATS.map(({ value, labelKey }) => (
                <div key={labelKey} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-3xl font-bold text-white">{value}</p>
                  <p className="mt-1 text-sm text-slate-300">{t(labelKey)}</p>
                </div>
              ))}
            </div>
          </section>

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
