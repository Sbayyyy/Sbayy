import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/Layout';

export default function CheckoutPage() {
  const { t } = useTranslation('common');

  return (
    <Layout title={t('checkout.pageTitle', 'Checkout')}>
      <div className="app-page">
        <div className="container mx-auto px-4 py-16">
          <div className="surface-card mx-auto max-w-2xl p-8 text-center">
            <h1 className="text-3xl font-bold text-slate-950">
              {t('cart.disabledTitle', 'Cart and checkout are currently disabled')}
            </h1>
            <p className="mt-4 text-slate-600">
              {t('cart.disabledMessage', 'SBay is currently focused on classifieds listings and direct seller messaging. Cart checkout will return in a later release.')}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/browse" className="btn btn-primary">
                {t('cart.browseListings', 'Browse listings')}
              </Link>
              <Link href="/messages" className="btn btn-secondary">
                {t('nav.messages', 'Messages')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return { props: { ...(await serverSideTranslations(locale ?? 'ar', ['common'])) } };
}
