import type { GetServerSideProps } from 'next';
import { CATEGORIES } from '@/lib/constants/categories';

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
  '/search',
  '/seller-guide',
  '/seller-protection',
  '/seller-tips',
  '/terms',
];

function urlEntry(siteUrl: string, path: string, priority: string, changefreq = 'weekly') {
  const loc = `${siteUrl}${path}`;
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    `    <xhtml:link rel="alternate" hreflang="ar" href="${loc}" />`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en${path}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />`,
    '  </url>',
  ].join('\n');
}

function buildSitemap() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://syrian-bay.com').replace(/\/+$/, '');
  const categoryPaths = CATEGORIES.map((category) => `/category/${category.slug}`);
  const urls = [
    ...staticPaths.map((path) => urlEntry(siteUrl, path, path === '' ? '1.0' : '0.7')),
    ...categoryPaths.map((path) => urlEntry(siteUrl, path, '0.8')),
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
  res.write(buildSitemap());
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
