import { useState, useEffect, useCallback, useRef } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCard from '@/components/ProductCard';
import FilterSidebar from '@/components/FilterSidebar';
import { getAllListings } from '@/lib/api/listings';
import { fetchListingsPageSSR } from '@/lib/api/server';
import { Product, SearchFilters } from '@sbay/shared';
import { Loader2, AlertCircle, Filter, Home, ChevronRight, Package } from 'lucide-react';
import { CATEGORIES, CITIES, getCategoryDescription, getCategoryName } from '@/lib/constants';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import {
  absoluteUrl,
  buildBreadcrumbList,
  buildCollectionPageSchema,
  buildItemListSchema,
  listingPath,
  type SeoLocale,
} from '@/lib/seo';

const PAGE_SIZE = 20;

interface CategoryPageProps {
  categorySlug: string;
  initialProducts: Product[];
  initialTotal: number;
  initialHasMore: boolean;
}

function buildCategorySeoTitle(name: string, locale: SeoLocale) {
  return locale === 'ar'
    ? `${name} للبيع في سوريا | سباي`
    : `${name} for sale in Syria | SBay`;
}

function buildCategorySeoDescription(name: string, description: string, locale: SeoLocale) {
  if (locale === 'ar') {
    return `تصفح إعلانات ${name} في سوريا على سباي. ${description ? `${description}. ` : ''}قارن الأسعار وتواصل مع البائعين المحليين في دمشق وحلب وباقي المحافظات.`;
  }

  return `Browse ${name} listings across Syria on SBay. ${description ? `${description}. ` : ''}Compare prices and contact trusted local sellers in Damascus, Aleppo, Homs, and nearby cities.`;
}

export default function CategoryPage({
  categorySlug,
  initialProducts,
  initialTotal,
  initialHasMore,
}: CategoryPageProps) {
  const router = useRouter();
  const { slug } = router.query;
  const slugValue = (Array.isArray(slug) ? slug[0] : slug) || categorySlug;
  const { t, i18n } = useTranslation('common');
  const didHydrateRef = useRef(false);

  const currentCategory = CATEGORIES.find(cat => cat.slug === slugValue);
  const currentCategoryName = currentCategory ? getCategoryName(currentCategory, i18n.language) : '';
  const currentCategoryDescription = currentCategory ? getCategoryDescription(currentCategory, i18n.language) || '' : '';
  const seoLocale = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as SeoLocale;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://syrian-bay.com').replace(/\/+$/, '');
  const canonicalPath = `/category/${slugValue}`;

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [priceError, setPriceError] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    category: categorySlug,
    minPrice: 0,
    maxPrice: undefined,
    condition: undefined,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const loadProducts = useCallback(async (reset = false, pageOverride?: number) => {
    try {
      setError('');
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : (pageOverride ?? page);
      const normalizedFilters = {
        ...filters,
        minPrice: filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice ? undefined : filters.minPrice,
        maxPrice: filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice ? undefined : (filters.maxPrice === 0 ? undefined : filters.maxPrice),
      };
      const data = await getAllListings(currentPage, PAGE_SIZE, normalizedFilters);

      setProducts(prev => (reset ? data.items : [...prev, ...data.items]));
      setHasMore(data.totalPages > currentPage);
      setError('');
    } catch (err) {
      console.error('Error loading products:', err);
      setError(t('category.loadError'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, page, t]);

  useEffect(() => {
    if (slugValue && slugValue !== filters.category) {
      setFilters(prev => ({ ...prev, category: slugValue }));
      setProducts([]);
      setPage(1);
    }
  }, [slugValue, filters.category]);

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }

    if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) {
      setPriceError(t('category.priceError'));
      setError('');
      return;
    }

    if (priceError) {
      setPriceError('');
    }

    if (filters.category) {
      void loadProducts(true);
    }
  }, [filters, loadProducts, priceError, t]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      void loadProducts(false, nextPage);
    }
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleFilterChange = (update: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...update }));
  };

  const clearFilters = () => {
    setFilters({
      category: slugValue || '',
      minPrice: 0,
      maxPrice: undefined,
      condition: undefined,
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  if (!currentCategory && !loading) {
    return (
      <Layout seo={{ noindex: true }}>
        <div className="info-page flex items-center justify-center px-4">
          <div className="info-panel max-w-md text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h1 className="mb-2 text-2xl font-bold text-slate-950">{t('category.notFound')}</h1>
            <p className="mb-6 text-slate-600">{t('category.notFoundMessage')}</p>
            <Link href="/" className="btn btn-primary">
              {t('category.backHome')}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const seoTitle = buildCategorySeoTitle(currentCategoryName, seoLocale);
  const seoDescription = buildCategorySeoDescription(currentCategoryName, currentCategoryDescription, seoLocale);
  const breadcrumb = buildBreadcrumbList([
    { name: seoLocale === 'ar' ? 'الرئيسية' : 'Home', url: absoluteUrl(siteUrl, '/') },
    { name: seoLocale === 'ar' ? 'تصفح الإعلانات' : 'Browse listings', url: absoluteUrl(siteUrl, '/browse') },
    { name: currentCategoryName, url: absoluteUrl(siteUrl, canonicalPath) },
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
    products.slice(0, PAGE_SIZE).map(product => ({
      name: product.title,
      url: absoluteUrl(siteUrl, listingPath(product)),
      image: toAbsoluteImage(product.thumbnailUrl || product.imageUrls?.[0]),
    }))
  );
  const popularCities = CITIES.slice(0, 6);

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
              <span className="font-semibold text-slate-900">{currentCategoryName}</span>
            </nav>

            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl shadow-sm ring-1 ring-slate-200/70">{currentCategory?.icon}</div>
              <div>
                <h1 className="section-heading">{currentCategoryName}</h1>
                <p className="section-subhead">{seoDescription}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
              <span>{loading ? t('category.loadingProducts') : t('category.productCount', { count: products.length || initialTotal })}</span>
              {popularCities.map(city => (
                <Link
                  key={city.value}
                  href={`/${city.value}/${slugValue}`}
                  className="pill-link"
                >
                  {seoLocale === 'ar'
                    ? `${currentCategoryName} في ${t(city.i18nKey, city.i18nDefault)}`
                    : `${currentCategoryName} in ${t(city.i18nKey, city.i18nDefault)}`}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 pt-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              showCategories={false}
              showSort
              priceError={priceError}
            />

            <div className="flex-1">
              <div className="mb-4 flex items-center justify-between lg:hidden">
                <p className="text-sm text-slate-600">
                  {loading ? t('category.loadingProducts') : t('category.productCountShort', { count: products.length })}
                </p>
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(true)}
                  className="sort-pill"
                >
                  <Filter className="h-4 w-4" />
                  {t('category.filter')}
                </button>
              </div>

              {error && (
                <div className="surface-card mb-6 border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
              ) : products.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {products.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onFavorite={toggleFavorite}
                        isFavorite={favorites.includes(product.id)}
                      />
                    ))}
                  </div>

                  {hasMore && (
                    <div className="mt-8 text-center">
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="btn btn-outline"
                      >
                        {loadingMore ? (
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        ) : (
                          t('category.loadMore')
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <Package className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                  <h2 className="mb-2 text-xl font-bold text-slate-950">{t('category.emptyTitle')}</h2>
                  <p className="text-slate-600">{t('category.emptyMessage')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {showMobileFilters && (
          <FilterSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            showCategories={false}
            showSort
            priceError={priceError}
            isMobile
            onClose={() => setShowMobileFilters(false)}
          />
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<CategoryPageProps> = async ({ params, locale, res }) => {
  const categorySlug = typeof params?.slug === 'string' ? params.slug : '';
  const category = CATEGORIES.find(cat => cat.slug === categorySlug);

  if (!category) {
    return { notFound: true };
  }

  const listings = await fetchListingsPageSSR(1, PAGE_SIZE, { category: category.slug });
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=900');

  return {
    props: {
      categorySlug,
      initialProducts: listings?.items ?? [],
      initialTotal: listings?.total ?? listings?.items.length ?? 0,
      initialHasMore: (listings?.totalPages ?? 0) > 1 || (listings?.items.length ?? 0) >= PAGE_SIZE,
      ...(await serverSideTranslations(locale ?? 'ar', ['common'])),
    },
  };
};
