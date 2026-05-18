import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { getAllListings } from '@/lib/api/listings';
import { Product, defaultTextInputValidator, loadProfanityListFromUrl } from '@sbay/shared';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { Check, ChevronDown, Search, MapPin, Package } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { CITIES, HOMEPAGE_CATEGORIES, getCategoryName, getCityI18nKeyFromValue, getCityLabel } from '@/lib/constants';

export default function Home() {
  const router = useRouter();
  const { t, i18n } = useTranslation('common');
  const [browseProducts, setBrowseProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);
  const [searchError, setSearchError] = useState('');
  const regionMenuRef = useRef<HTMLDivElement>(null);
  const selectedRegionI18nKey = getCityI18nKeyFromValue(selectedRegion);
  const selectedRegionLabel = selectedRegion
    ? selectedRegionI18nKey
      ? t(selectedRegionI18nKey, getCityLabel(selectedRegion, i18n.language))
      : getCityLabel(selectedRegion, i18n.language)
    : '';
  
  useEffect(() => {
    loadHomeProducts();
  }, []);

  useEffect(() => {
    void loadProfanityListFromUrl('/profanities.txt');
  }, []);

  useEffect(() => {
    if (!regionMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!regionMenuRef.current?.contains(event.target as Node)) {
        setRegionMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRegionMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [regionMenuOpen]);

  const loadHomeProducts = async () => {
    try {
      const data = await getAllListings(1, 24);
      const products = data?.items ?? (Array.isArray(data) ? data : []);
      const featured = products.filter(product => product.isBoosted);
      const regular = products.filter(product => !product.isBoosted);

      setFeaturedProducts(featured.slice(0, 8));
      setBrowseProducts((regular.length > 0 ? regular : products).slice(0, 8));
    } catch (err) {
      console.error('Error loading home products:', err);
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
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedRegion) params.set('region', selectedRegion);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <Layout title={t('home.title')}>
      <div className="app-page space-y-8 py-6">
        <div className="container mx-auto px-4">
          <div className="surface-card p-5 sm:p-6">
            <div className="mx-auto max-w-4xl space-y-4">
              <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-[1fr_15rem]">
                <div className="relative">
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
                </div>
                <div ref={regionMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setRegionMenuOpen(open => !open)}
                    className="input flex h-14 items-center justify-between rounded-2xl text-left"
                    aria-expanded={regionMenuOpen}
                    aria-haspopup="listbox"
                    aria-label={t('home.regionSelect', 'Select region')}
                  >
                    <span className="truncate">{selectedRegionLabel || t('home.allRegions', 'All regions')}</span>
                    <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-500 transition-transform ${regionMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {regionMenuOpen && (
                    <div
                      role="listbox"
                      className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
                    >
                      {[
                        { value: '', label: t('home.allRegions', 'All regions') },
                        ...CITIES.map(city => ({
                          value: city.value,
                          label: t(city.i18nKey, city.i18nDefault),
                        })),
                      ].map(option => {
                        const selected = selectedRegion === option.value;

                        return (
                          <button
                            key={option.value || 'all'}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setSelectedRegion(option.value);
                              setRegionMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                              selected
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                            }`}
                          >
                            <span className="truncate">{option.label}</span>
                            {selected && <Check className="h-4 w-4 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </form>
              {searchError && <p className="text-sm font-medium text-red-600">{searchError}</p>}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4" />
                <span>{selectedRegionLabel || t('home.allRegions', 'All regions')}</span>
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
                  <span className="text-center text-xs font-semibold">{getCategoryName(category, i18n.language)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-950">{t('home.browseListings', 'Browse listings')}</h2>
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
          ) : browseProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {browseProducts.map(product => (
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

        {(loading || featuredProducts.length > 0) && (
          <div className="container mx-auto px-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-950">{t('home.featuredListings')}</h2>
              <Link href="/browse" className="rounded-full px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50">
                {t('common.viewAll')}
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {featuredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}
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

