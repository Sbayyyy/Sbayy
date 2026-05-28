import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, MessageCircle, PlusCircle, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { HOMEPAGE_CATEGORIES, getCategoryName } from '@/lib/constants';
import { trackInteraction } from '@/lib/api/recommendations';
import RegionSelector from './RegionSelector';

interface HomeHeroProps {
  searchQuery: string;
  searchError: string;
  selectedRegion: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSearchFocus: () => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRegionChange: (region: string) => void;
}

const POPULAR_HERO_CATEGORY_IDS = ['cars', 'electronics', 'furniture', 'fashion'];

export default function HomeHero({
  searchQuery,
  searchError,
  selectedRegion,
  onSearchChange,
  onSearchFocus,
  onSearchSubmit,
  onRegionChange,
}: HomeHeroProps) {
  const { t, i18n } = useTranslation('common');
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);

  const scrollToNextSection = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' });
  }, []);

  const heroTrustItems = [
    { icon: Check, label: t('home.heroTrustFree') },
    { icon: ShieldCheck, label: t('home.heroTrustProtection') },
    { icon: MessageCircle, label: t('home.heroTrustMessaging') },
  ];

  const heroChipCategories = POPULAR_HERO_CATEGORY_IDS
    .map(id => HOMEPAGE_CATEGORIES.find(category => category.id === id))
    .filter((category): category is NonNullable<typeof category> => Boolean(category));

  return (
    <section className="hero-section relative">
      <div aria-hidden="true" className="hero-ambient pointer-events-none absolute inset-0" />

      <div className="container relative mx-auto flex min-h-0 flex-col justify-start px-4 pb-8 pt-8 sm:min-h-[calc(100vh-4rem)] sm:justify-center sm:pb-16 sm:pt-16 lg:pb-20 lg:pt-20">
        <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col items-center text-center">
          <div
            className="hero-fade-up inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur"
            style={{ animationDelay: '0ms' }}
          >
            <span className="hero-eyebrow-dot" aria-hidden="true" />
            <span>{t('home.heroEyebrow')}</span>
          </div>

          <h1
            className="hero-headline hero-fade-up mt-5 w-full max-w-full text-4xl font-extrabold leading-[1.08] text-slate-950 sm:mt-6 sm:text-6xl sm:leading-[1.05] lg:text-7xl"
            style={{ animationDelay: '80ms' }}
          >
            {t('home.heroTitle')}
          </h1>

          <p
            className="hero-fade-up mt-4 w-full max-w-2xl text-sm leading-6 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8"
            style={{ animationDelay: '160ms' }}
          >
            {t('home.heroSubtitle')}
          </p>

          <div
            className={`hero-fade-up mt-7 w-full sm:mt-10 ${regionMenuOpen ? 'relative z-[70]' : ''}`}
            style={{ animationDelay: '240ms' }}
          >
            <form onSubmit={onSearchSubmit}>
              <div className="hero-command-bar mx-auto flex flex-col sm:flex-row sm:items-stretch">
                <div className="relative flex flex-1 items-center">
                  <Search className="pointer-events-none absolute start-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={onSearchChange}
                    onFocus={onSearchFocus}
                    placeholder={t('home.heroSearchPlaceholder')}
                    className="hero-command-input ps-12"
                    aria-label={t('home.heroSearchPlaceholder')}
                  />
                </div>

                <div className="hero-command-divider hidden sm:block" aria-hidden="true" />

                <RegionSelector
                  selectedRegion={selectedRegion}
                  onRegionChange={onRegionChange}
                  onOpenChange={setRegionMenuOpen}
                />

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
            className="hero-fade-up mt-5 flex w-full max-w-full items-center gap-2 overflow-x-auto pb-2 sm:mt-6 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0"
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
            className="hero-fade-up mt-6 flex w-full flex-col items-stretch gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:items-center sm:gap-5"
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
            className="hero-fade-up hero-trust-row mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:mt-9"
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
  );
}
