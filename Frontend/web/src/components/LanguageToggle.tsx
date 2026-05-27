import { Languages } from 'lucide-react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

type LocaleCode = 'ar' | 'en';

interface LanguageToggleProps {
  variant?: 'segmented' | 'compact';
  className?: string;
}

const LOCALES: Array<{ value: LocaleCode; label: string; shortLabel: string }> = [
  { value: 'ar', label: 'عربي', shortLabel: 'ع' },
  { value: 'en', label: 'English', shortLabel: 'EN' },
];

function normalizeLocale(value?: string): LocaleCode {
  return value?.startsWith('ar') ? 'ar' : 'en';
}

export default function LanguageToggle({ variant = 'segmented', className = '' }: LanguageToggleProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation('common');
  const currentLocale = normalizeLocale(router.locale || i18n?.language || 'ar');
  const nextLocale = currentLocale === 'ar' ? 'en' : 'ar';

  const setLocaleCookie = (locale: LocaleCode) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
  };

  const ensureLocaleLoaded = async (locale: LocaleCode) => {
    if (!i18n) return;
    if (typeof i18n.hasResourceBundle === 'function' && i18n.hasResourceBundle(locale, 'common')) return;
    if (typeof i18n.addResourceBundle !== 'function') return;

    const response = await fetch(`/locales/${locale}/common.json`);
    if (!response.ok) return;
    const resources = await response.json();
    i18n.addResourceBundle(locale, 'common', resources, true, true);
  };

  const changeLocale = async (locale: LocaleCode) => {
    if (locale === currentLocale || typeof document === 'undefined') return;

    setLocaleCookie(locale);
    await ensureLocaleLoaded(locale);
    i18n?.changeLanguage?.(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';

    if (router.locales?.includes(locale)) {
      void router.replace(router.asPath, undefined, { locale, scroll: false });
    }
  };

  if (variant === 'compact') {
    const next = LOCALES.find(item => item.value === nextLocale)!;
    return (
      <button
        type="button"
        className={`language-toggle-compact ${className}`}
        onClick={() => void changeLocale(nextLocale)}
        aria-label={t(
          nextLocale === 'ar' ? 'language.switchToArabic' : 'language.switchToEnglish',
          nextLocale === 'ar' ? 'Switch to Arabic' : 'Switch to English'
        )}
        title={next.label}
      >
        <Languages className="h-4 w-4" aria-hidden="true" />
        <span>{next.shortLabel}</span>
      </button>
    );
  }

  return (
    <div
      className={`language-toggle ${className}`}
      role="group"
      aria-label={t('language.selectLanguage', 'Select language')}
    >
      {LOCALES.map(item => (
        <button
          key={item.value}
          type="button"
          onClick={() => void changeLocale(item.value)}
          className={`language-toggle-btn ${currentLocale === item.value ? 'language-toggle-btn-active' : ''}`}
          aria-pressed={currentLocale === item.value}
        >
          {item.shortLabel}
        </button>
      ))}
    </div>
  );
}
