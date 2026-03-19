import { ReactNode } from 'react';
import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';
import { useTranslation } from 'next-i18next';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

export default function Layout({
  children,
  title,
  description,
  ogImage,
  canonicalUrl,
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
        <link rel="icon" href="/favicon.ico" />
        {/* OpenGraph */}
        <meta property="og:title" content={resolvedTitle} />
        <meta property="og:description" content={resolvedDescription} />
        <meta property="og:type" content="website" />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        <meta property="og:image" content={ogImage || '/og-image.png'} />
        <meta property="og:site_name" content="Sbayy" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={resolvedTitle} />
        <meta name="twitter:description" content={resolvedDescription} />
        <meta name="twitter:image" content={ogImage || '/og-image.png'} />
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
