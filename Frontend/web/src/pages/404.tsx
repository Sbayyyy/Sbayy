import Link from 'next/link';
import Layout from '@/components/Layout';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Home, Search } from 'lucide-react';

export default function Custom404() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <Head>
        <title>{t('errorPage.pageTitle404')}</title>
      </Head>
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-8xl font-bold text-gray-200 mb-4">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {t('errorPage.404.title')}
          </h1>
          <p className="text-gray-600 mb-8">
            {t('errorPage.404.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              {t('errorPage.404.backHome')}
            </Link>
            <Link
              href="/browse"
              className="btn-outline inline-flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              {t('errorPage.404.browseProducts')}
            </Link>
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
