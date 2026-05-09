import Link from 'next/link';
import Layout from '@/components/Layout';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function CartPage() {
  const { t } = useTranslation('common');

  return (
    <Layout title={t('cart.title')}>
      <div className="app-page flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="surface-card mx-auto max-w-xl p-10 text-center">
          <h1 className="mb-4 text-3xl font-bold text-slate-950">{t('cart.title')}</h1>
          <p className="mb-6 text-slate-600">{t('cart.disabledMessage') || 'The cart feature is currently disabled.'}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/browse" className="btn btn-primary">
              {t('nav.browse')}
            </Link>
            <Link href="/" className="btn btn-outline">
              {t('nav.home')}
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
