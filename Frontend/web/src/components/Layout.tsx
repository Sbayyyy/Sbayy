import { ReactNode } from 'react';
import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';
import { useTranslation } from 'next-i18next';
import { config } from '@/lib/config';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

export default function Layout({
  children,
  title,
  description,
  hideHeader = false,
  hideFooter = false,
}: LayoutProps) {
  const { t } = useTranslation('common');

  const resolvedTitle = title || t('layout.defaultTitle');
  const resolvedDescription = description || t('layout.defaultDescription');

  return (
    <>
      <Head>
        <title>{resolvedTitle}</title>
        <meta name="description" content={resolvedDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={config.logoUrl} />
        <link rel="shortcut icon" href={config.logoUrl} />
      </Head>

      <div className="flex flex-col min-h-screen">
        {!hideHeader && <Header />}
        <main className="flex-1 min-h-0">
          {children}
        </main>
        {!hideFooter && <Footer />}
      </div>
    </>
  );
}
