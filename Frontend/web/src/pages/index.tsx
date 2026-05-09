import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAllListings } from '@/lib/api/listings';
import { Product, defaultTextInputValidator, loadProfanityListFromUrl } from '@sbay/shared';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { Search, MapPin, Package } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { HOMEPAGE_CATEGORIES } from '@/lib/constants';

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  
  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  useEffect(() => {
    void loadProfanityListFromUrl('/profanities.txt');
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      const data = await getAllListings(1, 8);
      if (data && data.items) {
        setFeaturedProducts(data.items);
      } else if (Array.isArray(data)) {
        setFeaturedProducts(data.slice(0, 8));
      }
    } catch (err) {
      console.error('Error loading featured products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = defaultTextInputValidator.validate(searchQuery);
    if (!validation.isValid) {
      setSearchError(validation.message ?? 'Input contains disallowed content');
      return;
    }
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <Layout title={t('home.title')}>
      <div className="app-page space-y-8 py-6">
        <div className="container mx-auto px-4">
          <div className="surface-card p-5 sm:p-6">
            <div className="mx-auto max-w-4xl space-y-4">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSearchQuery(next);
                    const validation = defaultTextInputValidator.validate(next);
                    setSearchError(validation.isValid ? '' : validation.message ?? 'Input contains disallowed content');
                  }}
                  placeholder={t('home.searchPlaceholder')}
                  className="input h-14 rounded-2xl pr-11"
                />
              </form>
              {searchError && <p className="text-sm font-medium text-red-600">{searchError}</p>}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4" />
                <span>{t('home.locationHint')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4">
          <div className="surface-card p-5 sm:p-6">
            <h3 className="mb-4 text-xl font-bold text-slate-950">{t('home.browseCategories')}</h3>
            <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
              {HOMEPAGE_CATEGORIES.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="flex min-h-[5.75rem] flex-col items-center justify-center gap-2 rounded-2xl border border-transparent p-3 text-slate-700 transition-all hover:-translate-y-0.5 hover:border-primary-100 hover:bg-primary-50/60 hover:text-primary-700 hover:shadow-sm"
                >
                  <span className="text-2xl">{category.icon}</span>
                  <span className="text-center text-xs font-semibold">{category.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-950">{t('home.featuredListings')}</h2>
            <Link href="/browse" className="rounded-full px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50">
              {t('common.viewAll')}
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Package size={56} className="mx-auto mb-4 text-slate-300" />
              <h3 className="mb-2 text-xl font-semibold text-slate-950">{t('common.noProducts')}</h3>
              <p className="text-slate-600">{t('home.noProductsAvailable')}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}

