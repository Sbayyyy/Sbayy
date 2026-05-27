import Head from 'next/head';
import type { SeoLocale } from '@/lib/seo';
import { absoluteUrl, alternateLocaleUrl } from '@/lib/seo';

interface SeoHeadProps {
  /** Page title — already truncated to <70 chars by the caller. */
  title: string;
  /** Meta description — already truncated to <160 chars by the caller. */
  description: string;
  /** Path relative to siteUrl, e.g. /listing/iphone-13-damascus-{uuid}. */
  path: string;
  /** Full URL to the social-sharing image. Falls back to the SBay logo when omitted. */
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  /** ar | en — drives og:locale + hreflang. Defaults to ar (SBay default). */
  locale?: SeoLocale;
  /** schema.org type for og:type. Defaults to 'website'. */
  type?: 'website' | 'article' | 'product';
  /** When true, emits noindex,nofollow regardless of robots heuristics. */
  noindex?: boolean;
  /** JSON-LD nodes — Product/Breadcrumb/etc. Each is serialised into its own script. */
  jsonLd?: Array<Record<string, unknown> | null | undefined>;
  /** Brand site URL (no trailing slash). Defaults to NEXT_PUBLIC_SITE_URL or syrian-bay.com. */
  siteUrl?: string;
  /** OG site_name override. Defaults to 'SBay'. */
  siteName?: string;
}

const FALLBACK_SITE_URL = 'https://syrian-bay.com';
const FALLBACK_OG_IMAGE = '/assets/sbaylogo2.png';

/**
 * Centralised SEO <head> tags. Owns canonical, OG, Twitter, hreflang and JSON-LD
 * in one place so every page (listing, category, region) ships consistent metadata.
 *
 * Locale handling:
 *   - Arabic is the default locale and lives at the bare path.
 *   - English lives at /en/{path}.
 *   - We emit hreflang=ar, en, and x-default (= ar) every time.
 *   - og:locale matches the requested locale; og:locale:alternate names the other one.
 */
export default function SeoHead({
  title,
  description,
  path,
  image,
  imageAlt,
  imageWidth = 1200,
  imageHeight = 630,
  locale = 'ar',
  type = 'website',
  noindex = false,
  jsonLd = [],
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL,
  siteName = 'SBay',
}: SeoHeadProps) {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
  const cleanPath = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`;
  const canonical = locale === 'ar'
    ? absoluteUrl(cleanSiteUrl, cleanPath)
    : alternateLocaleUrl(cleanSiteUrl, cleanPath, 'en');
  const arUrl = alternateLocaleUrl(cleanSiteUrl, cleanPath, 'ar');
  const enUrl = alternateLocaleUrl(cleanSiteUrl, cleanPath, 'en');

  const resolvedImage = image && image.startsWith('http')
    ? image
    : absoluteUrl(cleanSiteUrl, image || FALLBACK_OG_IMAGE);
  const resolvedAlt = imageAlt || title;
  const ogLocale = locale === 'ar' ? 'ar_SY' : 'en_US';
  const alternateLocale = locale === 'ar' ? 'en_US' : 'ar_SY';

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      {/* Canonical + hreflang */}
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="ar" href={arUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="x-default" href={arUrl} />

      {/* Open Graph */}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:locale:alternate" content={alternateLocale} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:image:alt" content={resolvedAlt} />
      <meta property="og:image:width" content={String(imageWidth)} />
      <meta property="og:image:height" content={String(imageHeight)} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />
      <meta name="twitter:image:alt" content={resolvedAlt} />

      {/* Theme */}
      <meta name="theme-color" content="#2563eb" />
      <link rel="icon" href="/favicon.png" type="image/png" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

      {/* JSON-LD */}
      {jsonLd
        .filter((node): node is Record<string, unknown> => node != null)
        .map((node, idx) => (
          <script
            key={idx}
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
          />
        ))}
    </Head>
  );
}
