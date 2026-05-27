import { ReactNode } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from './Header';
import Footer from './Footer';
import VerifyEmailPrompt from './VerifyEmailPrompt';
import BugReportButton from './BugReportButton';
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
  const { t, i18n } = useTranslation('common');
  const router = useRouter();

  const resolvedTitle = title || t('layout.defaultTitle');
  const resolvedDescription = description || t('layout.defaultDescription');
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://syrian-bay.com').replace(/\/+$/, '');
  const cleanPath = (router.asPath || '/').split('#')[0].split('?')[0] || '/';
  const shouldNoIndex = [
    '/auth',
    '/cart',
    '/checkout',
    '/dashboard',
    '/favorites',
    '/manager',
    '/messages',
    '/order-confirmation',
    '/profile',
    '/seller/dashboard',
    '/seller/my-listings',
    '/user/dashboard',
  ].some((path) => cleanPath === path || cleanPath.startsWith(`${path}/`));
  const localizedPath = router.locale && router.locale !== 'ar'
    ? `/${router.locale}${cleanPath === '/' ? '' : cleanPath}`
    : cleanPath;
  const canonicalUrl = `${siteUrl}${localizedPath === '/' ? '' : localizedPath}`;
  const arUrl = `${siteUrl}${cleanPath === '/' ? '' : cleanPath}`;
  const enUrl = `${siteUrl}/en${cleanPath === '/' ? '' : cleanPath}`;
  const logoUrl = config.logoUrl.startsWith('http')
    ? config.logoUrl
    : `${siteUrl}${config.logoUrl.startsWith('/') ? config.logoUrl : `/${config.logoUrl}`}`;
  const currentLocale = i18n?.language || router.locale || 'ar';
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'SBay',
        url: siteUrl,
        logo: logoUrl,
        contactPoint: {
          '@type': 'ContactPoint',
          email: config.supportEmail,
          contactType: 'customer support',
          availableLanguage: ['Arabic', 'English'],
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'SBay',
        url: siteUrl,
        inLanguage: ['ar', 'en'],
        publisher: { '@id': `${siteUrl}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/search?query={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <>
      <Head>
        <title>{resolvedTitle}</title>
        <meta name="description" content={resolvedDescription} />
        <meta name="robots" content={shouldNoIndex ? 'noindex,nofollow' : 'index,follow'} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="ar" href={arUrl} />
        <link rel="alternate" hrefLang="en" href={enUrl} />
        <link rel="alternate" hrefLang="x-default" href={arUrl} />
        <meta property="og:site_name" content="SBay" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content={currentLocale === 'ar' ? 'ar_SY' : 'en_US'} />
        <meta property="og:title" content={resolvedTitle} />
        <meta property="og:description" content={resolvedDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={logoUrl} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={resolvedTitle} />
        <meta name="twitter:description" content={resolvedDescription} />
        <meta name="twitter:image" content={logoUrl} />
        <meta name="theme-color" content="#2563eb" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>

      <div className="flex flex-col min-h-screen">
        {!hideHeader && <Header />}
        {!hideHeader && <VerifyEmailPrompt />}
        <main className="flex-1 min-h-0">
          {children}
        </main>
        {!hideHeader && <BugReportButton />}
        {!hideFooter && <Footer />}
      </div>
    </>
  );
}
