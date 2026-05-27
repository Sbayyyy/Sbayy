import type { GetServerSideProps } from 'next';
import { CATEGORIES } from '@/lib/constants/categories';
import { CITIES } from '@/lib/constants/cities';
import { fetchListingsPageSSR } from '@/lib/api/server';
import { listingPath } from '@/lib/seo';

const staticPaths = [
  '',
  '/about',
  '/browse',
  '/buyer-protection',
  '/contact',
  '/fees',
  '/help',
  '/how-it-works',
  '/privacy-policy',
  '/seller-guide',
  '/seller-protection',
  '/seller-tips',
  '/terms',
];

const LISTING_SITEMAP_PAGE_SIZE = 100;
const MAX_LISTING_SITEMAP_PAGES = 10;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function lastmod(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function urlEntry(siteUrl: string, path: string, priority: string, changefreq = 'weekly', modifiedAt?: string) {
  const loc = `${siteUrl}${path}`;
  const lastModified = lastmod(modifiedAt);
  const lines = [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastModified ? `    <lastmod>${lastModified}</lastmod>` : '',
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    `    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(loc)}" />`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${siteUrl}/en${path}`)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(loc)}" />`,
    '  </url>',
  ].filter(Boolean);

  return lines.join('\n');
}

async function listingUrlEntries(siteUrl: string) {
  const entries: string[] = [];

  for (let page = 1; page <= MAX_LISTING_SITEMAP_PAGES; page += 1) {
    const response = await fetchListingsPageSSR(page, LISTING_SITEMAP_PAGE_SIZE);
    const items = response?.items ?? [];
    if (items.length === 0) break;

    for (const listing of items) {
      if (!listing.id) continue;
      if (['sold', 'inactive', 'hidden', 'deleted'].includes(listing.status || '')) continue;
      entries.push(urlEntry(siteUrl, listingPath(listing), '0.85', 'daily', listing.updatedAt || listing.createdAt));
    }

    if (items.length < LISTING_SITEMAP_PAGE_SIZE) break;
  }

  return entries;
}

async function buildSitemap() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://syrian-bay.com').replace(/\/+$/, '');
  const categoryPaths = CATEGORIES.map((category) => `/category/${category.slug}`);
  const localCategoryPaths = CITIES.flatMap((city) =>
    CATEGORIES.map((category) => `/${city.value}/${category.slug}`)
  );
  const listingPaths = await listingUrlEntries(siteUrl);
  const urls = [
    ...staticPaths.map((path) => urlEntry(siteUrl, path, path === '' ? '1.0' : '0.7')),
    ...categoryPaths.map((path) => urlEntry(siteUrl, path, '0.8')),
    ...localCategoryPaths.map((path) => urlEntry(siteUrl, path, '0.65')),
    ...listingPaths,
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
  ].join('\n');
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  res.write(await buildSitemap());
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
