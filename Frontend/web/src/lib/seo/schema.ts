/**
 * schema.org JSON-LD builders.
 *
 * Each helper returns a plain object that's serialised into a
 * <script type="application/ld+json"> tag. We keep the helpers pure
 * so the same builders can be used from SSR (`getServerSideProps`)
 * and from client components.
 *
 * All helpers are locale-agnostic — they accept already-localised
 * strings (title, description, category label, region label) from the
 * caller, so Arabic listings produce Arabic schema and English listings
 * produce English schema. Google's structured-data parser handles both.
 */

import type { Product } from '@sbay/shared';
import type { SeoLocale } from './meta';
import { absoluteUrl } from './meta';

export interface BreadcrumbItem {
  name: string;
  url: string; // absolute URL
}

export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

interface ProductSchemaInput {
  siteUrl: string;
  listing: Product;
  canonicalPath: string;
  categoryLabel?: string | null;
  regionLabel?: string | null;
  locale: SeoLocale;
}

/**
 * Product + Offer JSON-LD for a listing detail page.
 *
 * Google ranks "useful" structured data — empty arrays / null fields hurt
 * more than missing ones, so we omit anything we don't have a value for.
 */
export function buildProductSchema({
  siteUrl,
  listing,
  canonicalPath,
  categoryLabel,
  regionLabel,
  locale,
}: ProductSchemaInput) {
  const canonical = absoluteUrl(siteUrl, canonicalPath);
  const images = (listing.imageUrls?.length ? listing.imageUrls : listing.thumbnailUrl ? [listing.thumbnailUrl] : [])
    .filter(Boolean)
    .map((url) => (url!.startsWith('http') ? url! : absoluteUrl(siteUrl, url!)));

  const isInStock = listing.stock === undefined || listing.stock > 0;
  const availability = isInStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

  const conditionMap: Record<string, string> = {
    New: 'https://schema.org/NewCondition',
    LikeNew: 'https://schema.org/NewCondition',
    Refurbished: 'https://schema.org/RefurbishedCondition',
    Used: 'https://schema.org/UsedCondition',
  };

  const offerLanguage = locale === 'ar' ? 'ar-SY' : 'en';
  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    url: canonical,
    priceCurrency: listing.priceCurrency || 'SYP',
    price: listing.priceAmount,
    availability,
    itemCondition: conditionMap[listing.condition] ?? 'https://schema.org/UsedCondition',
    inLanguage: offerLanguage,
  };

  if (regionLabel) {
    offer.areaServed = {
      '@type': 'AdministrativeArea',
      name: regionLabel,
      address: {
        '@type': 'PostalAddress',
        addressRegion: regionLabel,
        addressCountry: 'SY',
      },
    };
  }

  if (listing.seller?.name) {
    offer.seller = {
      '@type': 'Person',
      name: listing.seller.name,
      ...(listing.seller.id ? { url: absoluteUrl(siteUrl, `/seller/${listing.seller.id}`) } : {}),
    };
  }

  const product: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    sku: listing.id,
    productID: listing.id,
    url: canonical,
    inLanguage: offerLanguage,
    offers: offer,
  };

  if (images.length > 0) product.image = images;
  if (categoryLabel) product.category = categoryLabel;
  if (listing.seller?.rating && listing.seller.reviewCount) {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: listing.seller.rating,
      reviewCount: listing.seller.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return product;
}

interface CollectionPageSchemaInput {
  siteUrl: string;
  path: string;
  name: string;
  description: string;
  locale: SeoLocale;
}

export function buildCollectionPageSchema({
  siteUrl,
  path,
  name,
  description,
  locale,
}: CollectionPageSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: absoluteUrl(siteUrl, path),
    inLanguage: locale === 'ar' ? 'ar-SY' : 'en',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${siteUrl.replace(/\/+$/, '')}/#website`,
    },
  };
}

interface ItemListEntry {
  name: string;
  url: string;
  image?: string | null;
}

export function buildItemListSchema(items: ItemListEntry[]) {
  if (items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: item.url,
      name: item.name,
      ...(item.image ? { image: item.image } : {}),
    })),
  };
}
