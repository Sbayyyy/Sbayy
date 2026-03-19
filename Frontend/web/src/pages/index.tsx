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
      <div className="min-h-screen space-y-6 py-6">
        
        {/* Search Section */}
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                  className="w-full pr-10 pl-4 h-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </form>
              {searchError && <p className="text-sm text-red-500">{searchError}</p>}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{t('home.locationHint')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-xl font-bold mb-4">{t('home.browseCategories')}</h3>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {HOMEPAGE_CATEGORIES.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-2xl">{category.icon}</span>
                  <span className="text-xs text-center">{category.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Products */}
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{t('home.featuredListings')}</h2>
            <Link href="/browse" className="text-primary-600 hover:underline">
              {t('common.viewAll')}
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
              <Package size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('common.noProducts')}</h3>
              <p className="text-gray-600">{t('home.noProductsAvailable')}</p>
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

