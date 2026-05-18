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
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);
  const [searchError, setSearchError] = useState('');
  const regionMenuRef = useRef<HTMLDivElement>(null);
  const regionTriggerRef = useRef<HTMLButtonElement>(null);
  const regionListboxRef = useRef<HTMLDivElement>(null);
  const regionTypeaheadRef = useRef({ query: '', timestamp: 0 });
  const selectedRegionI18nKey = getCityI18nKeyFromValue(selectedRegion);
  const selectedRegionLabel = selectedRegion
    ? selectedRegionI18nKey
      ? t(selectedRegionI18nKey, getCityLabel(selectedRegion, i18n.language))
      : getCityLabel(selectedRegion, i18n.language)
    : '';
  const regionOptions = [
    { value: '', label: t('home.allRegions', 'All regions') },
    ...CITIES.map(city => ({
      value: city.value,
      label: t(city.i18nKey, city.i18nDefault),
    })),
  ];
  const activeRegionOptionId = `home-region-option-${regionOptions[activeRegionIndex]?.value || 'all'}`;
  
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

  useEffect(() => {
    if (!regionMenuOpen) return;
    regionListboxRef.current?.focus();
  }, [regionMenuOpen]);

  useEffect(() => {
    if (!regionMenuOpen) return;
    document.getElementById(activeRegionOptionId)?.scrollIntoView({ block: 'nearest' });
  }, [activeRegionOptionId, regionMenuOpen]);

  const openRegionMenu = () => {
    const selectedIndex = regionOptions.findIndex(option => option.value === selectedRegion);
    setActiveRegionIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setRegionMenuOpen(true);
  };

  const closeRegionMenu = (restoreFocus = false) => {
    setRegionMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => regionTriggerRef.current?.focus());
    }
  };

  const selectRegionOption = (index: number) => {
    const option = regionOptions[index];
    if (!option) return;
    setSelectedRegion(option.value);
    closeRegionMenu(true);
  };

  const handleRegionListboxKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveRegionIndex(index => Math.min(index + 1, regionOptions.length - 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        setActiveRegionIndex(index => Math.max(index - 1, 0));
        return;
      case 'Home':
        event.preventDefault();
        setActiveRegionIndex(0);
        return;
      case 'End':
        event.preventDefault();
        setActiveRegionIndex(regionOptions.length - 1);
        return;
      case 'Enter':
        event.preventDefault();
        selectRegionOption(activeRegionIndex);
        return;
      case 'Escape':
        event.preventDefault();
        closeRegionMenu(true);
        return;
      default:
        break;
    }

    if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) return;

    const now = Date.now();
    const nextQuery =
      now - regionTypeaheadRef.current.timestamp > 500
        ? event.key
        : regionTypeaheadRef.current.query + event.key;

    regionTypeaheadRef.current = { query: nextQuery, timestamp: now };
    const normalizedQuery = nextQuery.toLocaleLowerCase(i18n.language);
    const nextIndex = regionOptions.findIndex(option =>
      option.label.toLocaleLowerCase(i18n.language).startsWith(normalizedQuery)
    );

    if (nextIndex >= 0) {
      setActiveRegionIndex(nextIndex);
    }
  };

  const handleRegionTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openRegionMenu();
    }
  };

  const loadHomeProducts = async () => {
    try {
      const targetCount = 8;
      const perPage = 24;
      let page = 1;
      let hasMorePages = true;
      const featuredById = new Map<string, Product>();
      const browseById = new Map<string, Product>();

      while (browseById.size < targetCount && hasMorePages) {
        const data = await getAllListings(page, perPage);
        const products = data?.items ?? [];

        if (page === 1) {
          products
            .filter(product => product.isBoosted)
            .forEach(product => featuredById.set(product.id, product));
        }

        products
          .filter(product => !product.isBoosted && !featuredById.has(product.id))
          .forEach(product => {
            if (browseById.size < targetCount) {
              browseById.set(product.id, product);
            }
          });

        hasMorePages = products.length > 0 && page < data.totalPages;
        page += 1;
      }

      setFeaturedProducts(Array.from(featuredById.values()).slice(0, targetCount));
      setBrowseProducts(Array.from(browseById.values()).slice(0, targetCount));
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
                    ref={regionTriggerRef}
                    type="button"
                    onClick={() => (regionMenuOpen ? closeRegionMenu() : openRegionMenu())}
                    onKeyDown={handleRegionTriggerKeyDown}
                    className="input flex h-14 items-center justify-between rounded-2xl text-left"
                    aria-expanded={regionMenuOpen}
                    aria-haspopup="listbox"
                    aria-controls="home-region-listbox"
                    aria-label={t('home.regionSelect', 'Select region')}
                  >
                    <span className="truncate">{selectedRegionLabel || t('home.allRegions', 'All regions')}</span>
                    <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-500 transition-transform ${regionMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {regionMenuOpen && (
                    <div
                      id="home-region-listbox"
                      ref={regionListboxRef}
                      role="listbox"
                      tabIndex={-1}
                      aria-activedescendant={activeRegionOptionId}
                      onKeyDown={handleRegionListboxKeyDown}
                      className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
                    >
                      {regionOptions.map((option, index) => {
                        const selected = selectedRegion === option.value;
                        const active = activeRegionIndex === index;

                        return (
                          <div
                            key={option.value || 'all'}
                            id={`home-region-option-${option.value || 'all'}`}
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setActiveRegionIndex(index);
                              selectRegionOption(index);
                            }}
                            onMouseEnter={() => setActiveRegionIndex(index)}
                            className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                              selected
                                ? 'bg-primary-50 text-primary-700'
                                : active
                                  ? 'bg-slate-100 text-slate-950'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                            } ${active ? 'ring-2 ring-primary-200' : ''}`}
                          >
                            <span className="truncate">{option.label}</span>
                            {selected && <Check className="h-4 w-4 flex-shrink-0" />}
                          </div>
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

