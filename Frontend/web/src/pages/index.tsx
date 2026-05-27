import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { getAllListings } from '@/lib/api/listings';
import { getRecommendedListings, trackInteraction } from '@/lib/api/recommendations';
import { Product, defaultTextInputValidator, loadProfanityListFromUrl } from '@sbay/shared';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { ArrowRight, Check, ChevronDown, MapPin, MessageCircle, Package, PlusCircle, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { CITIES, HOMEPAGE_CATEGORIES, getCategoryDescription, getCategoryName, getCityI18nKeyFromValue, getCityLabel } from '@/lib/constants';

export default function Home() {
  const router = useRouter();
  const { t, i18n } = useTranslation('common');
  const [browseProducts, setBrowseProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [browsePage, setBrowsePage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
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
    void loadRecommended();
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
      const data = await getAllListings(1, 16);
      const products = data?.items ?? [];
      setFeaturedProducts(products.filter(p => p.isBoosted));
      setBrowseProducts(products.filter(p => !p.isBoosted));
      setHasMore((data?.page ?? 1) < (data?.totalPages ?? 1));
      setBrowsePage(1);
    } catch (err) {
      console.error('Error loading home products:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommended = async () => {
    const items = await getRecommendedListings(8);
    setRecommendedProducts(items);
  };

  const loadMoreBrowse = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = browsePage + 1;
      const data = await getAllListings(nextPage, 16);
      const products = data?.items ?? [];
      setBrowseProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = products.filter(p => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
      const more = (data?.page ?? nextPage) < (data?.totalPages ?? nextPage);
      setHasMore(more && products.length > 0);
      setBrowsePage(nextPage);
    } catch (err) {
      console.error('Error loading more products:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    const validation = defaultTextInputValidator.validate(trimmedQuery);
    if (!validation.isValid) {
      setSearchError(validation.message ?? 'Input contains disallowed content');
      return;
    }

    const params = new URLSearchParams();
    if (selectedRegion) params.set('region', selectedRegion);

    if (trimmedQuery) {
      params.set('q', trimmedQuery);
      router.push(`/search?${params.toString()}`);
    } else {
      router.push(`/browse${params.toString() ? `?${params.toString()}` : ''}`);
    }
  };

  const scrollToNextSection = () => {
    if (typeof window === 'undefined') return;
    window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' });
  };

  const handleCommandBarMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--glow-x', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--glow-y', `${event.clientY - rect.top}px`);
  };

  const heroTrustItems = [
    { icon: Check, label: t('home.heroTrustFree') },
    { icon: ShieldCheck, label: t('home.heroTrustProtection') },
    { icon: MessageCircle, label: t('home.heroTrustMessaging') },
  ];

  const POPULAR_HERO_CATEGORY_IDS = ['cars', 'electronics', 'furniture', 'fashion'];
  const heroChipCategories = POPULAR_HERO_CATEGORY_IDS
    .map(id => HOMEPAGE_CATEGORIES.find(c => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <Layout title={t('home.title')} description={t('home.heroSubtitle')}>
      <div className="app-page space-y-10 pb-8">
        <section className="hero-section relative">
          <div aria-hidden="true" className="hero-ambient pointer-events-none absolute inset-0" />

          <div className="container relative mx-auto flex min-h-[calc(100vh-4rem)] flex-col justify-center px-4 pb-14 pt-12 sm:pb-16 sm:pt-16 lg:pb-20 lg:pt-20">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <div
                className="hero-fade-up inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur"
                style={{ animationDelay: '0ms' }}
              >
                <span className="hero-eyebrow-dot" aria-hidden="true" />
                <span>{t('home.heroEyebrow')}</span>
              </div>

              <h1
                className="hero-headline hero-fade-up mt-6 text-5xl font-extrabold leading-[1.05] text-slate-950 sm:text-6xl lg:text-7xl"
                style={{ animationDelay: '80ms' }}
              >
                {t('home.heroTitle')}
              </h1>

              <p
                className="hero-fade-up mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8"
                style={{ animationDelay: '160ms' }}
              >
                {t('home.heroSubtitle')}
              </p>

              <div
                className={`hero-fade-up mt-10 w-full ${regionMenuOpen ? 'relative z-[70]' : ''}`}
                style={{ animationDelay: '240ms' }}
              >
                <form onSubmit={handleSearch}>
                  <div
                    className="hero-command-bar mx-auto flex flex-col sm:flex-row sm:items-stretch"
                    onMouseMove={handleCommandBarMouseMove}
                  >
                    <div className="relative flex flex-1 items-center">
                      <Search className="pointer-events-none absolute start-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => {
                          const next = e.target.value;
                          setSearchQuery(next);
                          const validation = defaultTextInputValidator.validate(next);
                          setSearchError(validation.isValid ? '' : validation.message ?? 'Input contains disallowed content');
                        }}
                        placeholder={t('home.heroSearchPlaceholder')}
                        className="hero-command-input ps-12"
                        aria-label={t('home.heroSearchPlaceholder')}
                      />
                    </div>

                    <div className="hero-command-divider hidden sm:block" aria-hidden="true" />

                    <div
                      ref={regionMenuRef}
                      className={`relative flex items-center sm:w-56 ${regionMenuOpen ? 'z-[60]' : 'z-0'}`}
                    >
                      <button
                        ref={regionTriggerRef}
                        type="button"
                        onClick={() => (regionMenuOpen ? closeRegionMenu() : openRegionMenu())}
                        onKeyDown={handleRegionTriggerKeyDown}
                        className="hero-command-region flex w-full items-center gap-2 text-start"
                        aria-expanded={regionMenuOpen}
                        aria-haspopup="listbox"
                        aria-controls="home-region-listbox"
                        aria-label={t('home.regionSelect', 'Select region')}
                      >
                        <MapPin className="h-4 w-4 flex-shrink-0 text-primary-600" aria-hidden="true" />
                        <span className="flex-1 truncate text-sm font-medium text-slate-800">
                          {selectedRegionLabel || t('home.allRegions', 'All regions')}
                        </span>
                        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${regionMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>

                      {regionMenuOpen && (
                        <div
                          id="home-region-listbox"
                          ref={regionListboxRef}
                          role="listbox"
                          tabIndex={-1}
                          aria-activedescendant={activeRegionOptionId}
                          onKeyDown={handleRegionListboxKeyDown}
                          className="hero-region-listbox"
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
                                }`}
                              >
                                <span className="truncate">{option.label}</span>
                                {selected && <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button type="submit" className="hero-command-submit justify-center sm:justify-start">
                      <Search className="h-4 w-4" aria-hidden="true" />
                      <span>{t('home.heroSearchCta')}</span>
                    </button>
                  </div>
                </form>

                {searchError && (
                  <p className="mt-3 text-sm font-medium text-red-600" role="alert">{searchError}</p>
                )}
              </div>

              <div
                className="hero-fade-up mt-6 flex w-full items-center gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0"
                style={{ animationDelay: '320ms' }}
                aria-label={t('home.heroTrendingLabel')}
              >
                <span className="hidden items-center gap-1.5 pe-1 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:inline-flex">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('home.heroTrendingLabel')}
                </span>
                {heroChipCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    onClick={() => void trackInteraction(category.slug, 'category_click')}
                    className="hero-chip"
                  >
                    <span className="hero-chip-icon" aria-hidden="true">{category.icon}</span>
                    <span className="truncate">{getCategoryName(category, i18n.language)}</span>
                  </Link>
                ))}
              </div>

              <div
                className="hero-fade-up mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-5"
                style={{ animationDelay: '400ms' }}
              >
                <Link href="/listing/sell" className="hero-cta-primary">
                  <PlusCircle className="h-5 w-5" aria-hidden="true" />
                  <span>{t('home.heroPostListing')}</span>
                  <span className="hero-cta-free-badge">{t('home.heroPostFree')}</span>
                </Link>
                <Link href="/browse" className="hero-cta-secondary">
                  <span>{t('home.heroBrowseListings')}</span>
                  <ArrowRight className="hero-cta-arrow" aria-hidden="true" />
                </Link>
              </div>

              <div
                className="hero-fade-up hero-trust-row mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
                style={{ animationDelay: '480ms' }}
              >
                {heroTrustItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <span key={item.label} className="inline-flex items-center gap-x-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{item.label}</span>
                      </span>
                      {idx < heroTrustItems.length - 1 && <span className="hero-trust-dot" aria-hidden="true" />}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={scrollToNextSection}
            className="hero-scroll-hint"
            aria-label={t('home.heroScrollHint', 'Scroll to explore')}
          >
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          </button>
        </section>

        {recommendedProducts.length > 0 && (
          <div className="container mx-auto px-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-950">{t('home.recommendedForYou', 'Recommended for you')}</h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {recommendedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        <div className="container mx-auto px-4">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">{t('home.categoriesHeading')}</h2>
              <p className="mt-1 text-sm text-slate-600 sm:text-base">{t('home.categoriesSubtitle')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {HOMEPAGE_CATEGORIES.map((category) => {
              const description = getCategoryDescription(category, i18n.language);
              return (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  onClick={() => void trackInteraction(category.slug, 'category_click')}
                  className="category-card group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                >
                  <span className="category-card-icon flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-2xl transition-colors group-hover:bg-primary-50">
                    {category.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-950 group-hover:text-primary-700">
                      {getCategoryName(category, i18n.language)}
                    </span>
                    {description && (
                      <span className="mt-0.5 block truncate text-xs leading-5 text-slate-500">
                        {description}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
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
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {browseProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={loadMoreBrowse}
                    disabled={loadingMore}
                    className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    {loadingMore ? t('common.loading', 'Loading…') : t('common.loadMore', 'Load more')}
                  </button>
                </div>
              )}
            </>
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

