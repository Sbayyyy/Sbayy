import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { ChevronRight, Home, MapPin, Package } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { Product } from '@sbay/shared';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import { fetchListingsPageSSR } from '@/lib/api/server';
import { CATEGORIES, CITIES, getCategoryDescription, getCategoryName } from '@/lib/constants';
import {
  absoluteUrl,
  buildBreadcrumbList,
  buildCollectionPageSchema,
  buildItemListSchema,
  listingPath,
  type SeoLocale,
} from '@/lib/seo';

const PAGE_SIZE = 20;

const CATEGORY_ALIASES: Record<string, string> = {
  apartments: 'real-estate',
  apartment: 'real-estate',
  property: 'real-estate',
  properties: 'real-estate',
  realestate: 'real-estate',
  vehicles: 'cars',
  vehicle: 'cars',
};

interface LocalCategoryPageProps {
  regionSlug: string;
  categorySlug: string;
  initialProducts: Product[];
  initialTotal: number;
  initialHasMore: boolean;
}

function normalizeCategorySlug(value: string) {
  return CATEGORY_ALIASES[value] ?? value;
}

function buildLocalSeoTitle(categoryName: string, cityName: string, locale: SeoLocale) {
  return locale === 'ar'
    ? `${categoryName} في ${cityName} | سباي`
    : `${categoryName} in ${cityName} | SBay`;
}

function buildLocalSeoDescription(
  categoryName: string,
  cityName: string,
  categoryDescription: string,
  locale: SeoLocale
) {
  if (locale === 'ar') {
    return `تصفح إعلانات ${categoryName} في ${cityName} على سباي. ${categoryDescription ? `${categoryDescription}. ` : ''}اعثر على عروض محلية حديثة وتواصل مع البائعين مباشرة داخل سوريا.`;
  }

  return `Browse ${categoryName} listings in ${cityName} on SBay. ${categoryDescription ? `${categoryDescription}. ` : ''}Find fresh local offers and message sellers directly across Syria.`;
}

export default function LocalCategoryPage({
  regionSlug,
  categorySlug,
  initialProducts,
  initialTotal,
  initialHasMore,
}: LocalCategoryPageProps) {
  const { t, i18n } = useTranslation('common');
  const seoLocale = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as SeoLocale;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://syrian-bay.com').replace(/\/+$/, '');

  const category = CATEGORIES.find(item => item.slug === categorySlug);
  const city = CITIES.find(item => item.value === regionSlug);

  const [favorites, setFavorites] = useState<string[]>([]);

  if (!category || !city) {
    return (
      <Layout seo={{ noindex: true }}>
        <div className="app-page flex items-center justify-center px-4">
          <div className="empty-state max-w-md">
            <Package className="mx-auto mb-4 h-16 w-16 text-slate-300" />
            <h1 className="mb-2 text-xl font-bold text-slate-950">{t('category.notFound')}</h1>
            <Link href="/browse" className="btn btn-primary">
              {t('category.backHome')}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const categoryName = getCategoryName(category, seoLocale);
  const cityName = seoLocale === 'ar'
    ? t(city.i18nKey, city.labelAr)
    : t(city.i18nKey, city.i18nDefault);
  const categoryDescription = getCategoryDescription(category, seoLocale) || '';
  const canonicalPath = `/${regionSlug}/${categorySlug}`;
  const seoTitle = buildLocalSeoTitle(categoryName, cityName, seoLocale);
  const pageHeading = seoLocale === 'ar'
    ? `${categoryName} في ${cityName}`
    : `${categoryName} in ${cityName}`;
  const seoDescription = buildLocalSeoDescription(categoryName, cityName, categoryDescription, seoLocale);
  const browsePath = `/browse?category=${encodeURIComponent(categorySlug)}&region=${encodeURIComponent(regionSlug)}`;

  const breadcrumb = buildBreadcrumbList([
    { name: seoLocale === 'ar' ? 'الرئيسية' : 'Home', url: absoluteUrl(siteUrl, '/') },
    { name: seoLocale === 'ar' ? 'تصفح الإعلانات' : 'Browse listings', url: absoluteUrl(siteUrl, '/browse') },
    { name: cityName, url: absoluteUrl(siteUrl, `/browse?region=${encodeURIComponent(regionSlug)}`) },
    { name: categoryName, url: absoluteUrl(siteUrl, canonicalPath) },
  ]);
  const collectionPage = buildCollectionPageSchema({
    siteUrl,
    path: canonicalPath,
    name: seoTitle,
    description: seoDescription,
    locale: seoLocale,
  });
  const toAbsoluteImage = (url?: string | null) => {
    if (!url) return undefined;
    return url.startsWith('http') ? url : absoluteUrl(siteUrl, url);
  };
  const itemList = buildItemListSchema(
    initialProducts.slice(0, PAGE_SIZE).map(product => ({
      name: product.title,
      url: absoluteUrl(siteUrl, listingPath(product)),
      image: toAbsoluteImage(product.thumbnailUrl || product.imageUrls?.[0]),
    }))
  );

  const nearbyCities = CITIES.filter(item => item.value !== regionSlug).slice(0, 6);
  const relatedCategories = CATEGORIES.filter(item => item.slug !== categorySlug).slice(0, 6);

  const toggleFavorite = (productId: string) => {
    setFavorites(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <Layout
      seo={{
        title: seoTitle,
        description: seoDescription,
        path: canonicalPath,
        jsonLd: [collectionPage, breadcrumb, itemList],
      }}
    >
      <div className="app-page pb-12">
        <section className="border-b border-slate-200/60 bg-white/60 backdrop-blur">
          <div className="container mx-auto px-4 py-8 sm:py-10">
            <nav className="mb-5 flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
              <Link href="/" className="flex items-center gap-1 transition-colors hover:text-primary-700">
                <Home className="h-4 w-4" />
                {t('category.breadcrumbHome')}
              </Link>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              <Link href={`/category/${categorySlug}`} className="transition-colors hover:text-primary-700">
                {categoryName}
              </Link>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              <span className="font-semibold text-slate-900">{cityName}</span>
            </nav>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl shadow-sm ring-1 ring-slate-200/70">
                {category.icon}
              </div>
              <div>
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-primary-700">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {cityName}
                </p>
                <h1 className="section-heading">{pageHeading}</h1>
                <p className="section-subhead">{seoDescription}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
              <span>{t('category.productCount', { count: initialTotal || initialProducts.length })}</span>
              <Link href={browsePath} className="pill-link">
                {seoLocale === 'ar' ? 'كل الإعلانات والفلاتر' : 'All listings and filters'}
              </Link>
              {nearbyCities.map(nearbyCity => {
                const nearbyName = seoLocale === 'ar'
                  ? t(nearbyCity.i18nKey, nearbyCity.labelAr)
                  : t(nearbyCity.i18nKey, nearbyCity.i18nDefault);
                return (
                  <Link
                    key={nearbyCity.value}
                    href={`/${nearbyCity.value}/${categorySlug}`}
                    className="pill-link"
                  >
                    {seoLocale === 'ar'
                      ? `${categoryName} في ${nearbyName}`
                      : `${categoryName} in ${nearbyName}`}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pt-8">
          {initialProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {initialProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onFavorite={toggleFavorite}
                  isFavorite={favorites.includes(product.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Package className="mx-auto mb-4 h-16 w-16 text-slate-300" />
              <h2 className="mb-2 text-xl font-bold text-slate-950">{t('category.emptyTitle')}</h2>
              <p className="text-slate-600">
                {seoLocale === 'ar'
                  ? `لا توجد إعلانات ${categoryName} في ${cityName} الآن. تصفح المدن أو الأقسام القريبة للعثور على خيارات مشابهة.`
                  : `There are no ${categoryName} listings in ${cityName} right now. Browse nearby cities or related categories for similar options.`}
              </p>
            </div>
          )}

          {initialHasMore && (
            <div className="mt-8 text-center">
              <Link href={browsePath} className="btn btn-outline">
                {seoLocale === 'ar' ? 'عرض المزيد في صفحة البحث' : 'See more in browse'}
              </Link>
            </div>
          )}
        </section>

        <section className="container mx-auto px-4 pt-10">
          <div className="surface-card p-5">
            <h2 className="mb-4 text-lg font-bold text-slate-950">
              {seoLocale === 'ar' ? `أقسام أخرى في ${cityName}` : `Other categories in ${cityName}`}
            </h2>
            <div className="flex flex-wrap gap-3">
              {relatedCategories.map(relatedCategory => {
                const relatedName = getCategoryName(relatedCategory, seoLocale);
                return (
                  <Link
                    key={relatedCategory.slug}
                    href={`/${regionSlug}/${relatedCategory.slug}`}
                    className="pill-link"
                  >
                    {seoLocale === 'ar'
                      ? `${relatedName} في ${cityName}`
                      : `${relatedName} in ${cityName}`}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<LocalCategoryPageProps> = async ({ params, locale, res }) => {
  const regionSlug = typeof params?.region === 'string' ? params.region.toLowerCase() : '';
  const rawCategorySlug = typeof params?.category === 'string' ? params.category.toLowerCase() : '';
  const categorySlug = normalizeCategorySlug(rawCategorySlug);
  const city = CITIES.find(item => item.value === regionSlug);
  const category = CATEGORIES.find(item => item.slug === categorySlug || item.id === categorySlug);

  if (!city || !category) {
    return { notFound: true };
  }

  if (rawCategorySlug !== category.slug) {
    return {
      redirect: {
        destination: `/${city.value}/${category.slug}`,
        permanent: true,
      },
    };
  }

  const listings = await fetchListingsPageSSR(1, PAGE_SIZE, {
    category: category.slug,
    region: city.value,
  });

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=900');

  return {
    props: {
      regionSlug: city.value,
      categorySlug: category.slug,
      initialProducts: listings?.items ?? [],
      initialTotal: listings?.total ?? listings?.items.length ?? 0,
      initialHasMore: (listings?.totalPages ?? 0) > 1 || (listings?.items.length ?? 0) >= PAGE_SIZE,
      ...(await serverSideTranslations(locale ?? 'ar', ['common'])),
    },
  };
};
