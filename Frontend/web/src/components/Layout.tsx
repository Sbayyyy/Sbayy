import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Header from './Header';
import Footer from './Footer';
import VerifyEmailPrompt from './VerifyEmailPrompt';
import BugReportButton from './BugReportButton';
import SeoHead from './seo/SeoHead';
import { useTranslation } from 'next-i18next';
import { config } from '@/lib/config';
import { absoluteUrl, type SeoLocale } from '@/lib/seo';

interface LayoutSeoOverrides {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  jsonLd?: Array<Record<string, unknown> | null | undefined>;
  /** Override the canonical path. Defaults to router.asPath (stripped of query/hash). */
  path?: string;
}

interface LayoutProps {
  children: ReactNode;
  /** Convenience for pages that just need a title (back-compat). */
  title?: string;
  /** Convenience for pages that just need a description (back-compat). */
  description?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
  /** Full SEO override — when present, replaces title/description/etc with rich metadata. */
  seo?: LayoutSeoOverrides;
}

/**
 * App layout with header/footer + a single, centralized SEO head.
 *
 * SEO precedence:
 *   1. `seo.title` / `seo.description` / etc. (rich overrides from a page)
 *   2. `title` / `description` props (legacy convenience)
 *   3. i18n defaults (`layout.defaultTitle`, `layout.defaultDescription`)
 *
 * Canonical URL is derived from the router path unless overridden via `seo.path`.
 * Pages that need to redirect /listing/{uuid} → /listing/{slug}-{uuid} should
 * use `getServerSideProps`'s `redirect` rather than do it client-side.
 */
export default function Layout({
  children,
  title,
  description,
  hideHeader = false,
  hideFooter = false,
  seo,
}: LayoutProps) {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();

  const locale = ((router.locale || i18n?.language || 'ar').startsWith('ar') ? 'ar' : 'en') as SeoLocale;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://syrian-bay.com').replace(/\/+$/, '');

  // Strip query + hash so the canonical URL stays clean.
  const cleanPath = seo?.path ?? (router.asPath || '/').split('#')[0].split('?')[0] || '/';

  // Robots: noindex is automatic for these private routes; pages can override via seo.noindex.
  const privatePrefixes = [
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
  ];
  const isPrivate = privatePrefixes.some((p) => cleanPath === p || cleanPath.startsWith(`${p}/`));
  const noindex = seo?.noindex ?? isPrivate;

  const resolvedTitle = seo?.title || title || t('layout.defaultTitle');
  const resolvedDescription = seo?.description || description || t('layout.defaultDescription');

  const logoUrl = config.logoUrl.startsWith('http')
    ? config.logoUrl
    : absoluteUrl(siteUrl, config.logoUrl);

  // Build the default JSON-LD nodes (Organization + WebSite + SearchAction).
  // Pages can pass additional structured data via `seo.jsonLd`.
  const defaultJsonLd: Array<Record<string, unknown>> = [
    {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${siteUrl}/#organization`,
          name: 'SBay',
          alternateName: ['سباي', 'Syrian Bay'],
          url: siteUrl,
          logo: logoUrl,
          areaServed: {
            '@type': 'Country',
            name: locale === 'ar' ? 'سوريا' : 'Syria',
          },
          contactPoint: {
            '@type': 'ContactPoint',
            email: config.supportEmail,
            contactType: 'customer support',
            availableLanguage: ['Arabic', 'English', 'ar-SY', 'en'],
          },
        },
        {
          '@type': 'WebSite',
          '@id': `${siteUrl}/#website`,
          name: 'SBay',
          alternateName: locale === 'ar' ? 'سباي' : 'Syrian Bay',
          url: siteUrl,
          inLanguage: ['ar-SY', 'en'],
          publisher: { '@id': `${siteUrl}/#organization` },
          potentialAction: {
            '@type': 'SearchAction',
            target: `${siteUrl}/browse?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    },
  ];

  const allJsonLd = [...defaultJsonLd, ...(seo?.jsonLd ?? [])];

  return (
    <>
      <SeoHead
        title={resolvedTitle}
        description={resolvedDescription}
        path={cleanPath}
        image={seo?.image}
        imageAlt={seo?.imageAlt}
        imageWidth={seo?.imageWidth}
        imageHeight={seo?.imageHeight}
        locale={locale}
        type={seo?.type ?? 'website'}
        noindex={noindex}
        jsonLd={allJsonLd}
        siteUrl={siteUrl}
      />

      <div className="flex min-h-screen flex-col">
        {!hideHeader && <Header />}
        {!hideHeader && <VerifyEmailPrompt />}
        <main className="min-h-0 flex-1">{children}</main>
        {!hideHeader && <BugReportButton />}
        {!hideFooter && <Footer />}
      </div>
    </>
  );
}
