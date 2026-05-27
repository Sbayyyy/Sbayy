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
    <div className="info-card flex items-start gap-4">
      <div className="info-step-number">
        {index + 1}
      </div>
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-slate-950">
            {t(step.titleKey)}
          </h3>
        </div>
        <p className="text-sm leading-6 text-slate-600">
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

      <div className="info-page">
        <div className="info-shell space-y-10">
          <section className="info-hero">
            <span className="info-kicker">{t('footer.howItWorks')}</span>
            <h1 className="info-title">
              {t('howItWorks.title')}
            </h1>
            <p className="info-subtitle">
              {t('howItWorks.subtitle')}
            </p>
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <section>
              <h2 className="section-heading mb-5 text-center lg:text-start">
                {t('howItWorks.forBuyers')}
              </h2>
              <div className="space-y-4">
                {BUYER_STEPS.map((step, idx) => (
                  <StepCard key={step.titleKey} step={step} index={idx} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="section-heading mb-5 text-center lg:text-start">
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
