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
    <Layout title={t('about.pageTitle')} description={t('about.subtitle')}>
      <div className="min-h-screen py-10">
        <div className="max-w-5xl mx-auto px-4 space-y-12">

          {/* Hero Section */}
          <section className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">
              {t('about.title')}
            </h1>
            <p className="text-xl text-primary-600 font-medium">
              {t('about.subtitle')}
            </p>
            <p className="text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('about.description')}
            </p>
          </section>

          {/* Mission Section */}
          <section className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('about.mission.title')}
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {t('about.mission.content')}
            </p>
          </section>

          {/* Values Grid */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {VALUES.map(({ icon: Icon, titleKey, descKey }) => (
                <div
                  key={titleKey}
                  className="bg-white rounded-lg shadow p-6 flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {t(titleKey)}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {t(descKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Stats Bar */}
          <section className="bg-primary-600 rounded-lg shadow p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {STATS.map(({ value, labelKey }) => (
                <div key={labelKey}>
                  <p className="text-3xl font-bold text-white">{value}</p>
                  <p className="text-primary-100 text-sm mt-1">{t(labelKey)}</p>
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
