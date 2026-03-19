import Layout from '@/components/Layout';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import {
  UserPlus,
  Search,
  MessageSquare,
  ShoppingBag,
  Package,
  MessageCircle,
  CheckCircle,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}

const BUYER_STEPS: Step[] = [
  { icon: UserPlus, titleKey: 'howItWorks.buyerSteps.register.title', descKey: 'howItWorks.buyerSteps.register.description' },
  { icon: Search, titleKey: 'howItWorks.buyerSteps.browse.title', descKey: 'howItWorks.buyerSteps.browse.description' },
  { icon: MessageSquare, titleKey: 'howItWorks.buyerSteps.contact.title', descKey: 'howItWorks.buyerSteps.contact.description' },
  { icon: ShoppingBag, titleKey: 'howItWorks.buyerSteps.buy.title', descKey: 'howItWorks.buyerSteps.buy.description' },
];

const SELLER_STEPS: Step[] = [
  { icon: UserPlus, titleKey: 'howItWorks.sellerSteps.register.title', descKey: 'howItWorks.sellerSteps.register.description' },
  { icon: Package, titleKey: 'howItWorks.sellerSteps.list.title', descKey: 'howItWorks.sellerSteps.list.description' },
  { icon: MessageCircle, titleKey: 'howItWorks.sellerSteps.respond.title', descKey: 'howItWorks.sellerSteps.respond.description' },
  { icon: CheckCircle, titleKey: 'howItWorks.sellerSteps.sell.title', descKey: 'howItWorks.sellerSteps.sell.description' },
];

function StepCard({ step, index }: { step: Step; index: number }) {
  const { t } = useTranslation('common');
  const Icon = step.icon;

  return (
    <div className="flex items-start gap-4 bg-white rounded-lg shadow p-5 border-l-4 border-primary-500">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-lg">
        {index + 1}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {t(step.titleKey)}
          </h3>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">
          {t(step.descKey)}
        </p>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  const { t } = useTranslation('common');

  return (
    <Layout title={t('howItWorks.pageTitle')}>
      <Head>
        <meta name="description" content={t('howItWorks.subtitle')} />
      </Head>

      <div className="min-h-screen py-10">
        <div className="max-w-5xl mx-auto px-4 space-y-12">

          {/* Header */}
          <section className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-gray-900">
              {t('howItWorks.title')}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('howItWorks.subtitle')}
            </p>
          </section>

          {/* Buyer & Seller Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* For Buyers */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center lg:text-start">
                {t('howItWorks.forBuyers')}
              </h2>
              <div className="space-y-4">
                {BUYER_STEPS.map((step, idx) => (
                  <StepCard key={step.titleKey} step={step} index={idx} />
                ))}
              </div>
            </section>

            {/* For Sellers */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center lg:text-start">
                {t('howItWorks.forSellers')}
              </h2>
              <div className="space-y-4">
                {SELLER_STEPS.map((step, idx) => (
                  <StepCard key={step.titleKey} step={step} index={idx} />
                ))}
              </div>
            </section>

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
