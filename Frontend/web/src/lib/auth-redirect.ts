const SUPPORTED_LOCALES = new Set(['ar', 'en']);
const DEFAULT_LOCALE = 'ar';

export function getLocalizedLoginRedirect(pathname: string, search: string = '', locale?: string | null): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const firstSegment = normalizedPath.split('/')[1];
  const localePrefix = SUPPORTED_LOCALES.has(firstSegment)
    ? `/${firstSegment}`
    : locale && SUPPORTED_LOCALES.has(locale) && locale !== DEFAULT_LOCALE
      ? `/${locale}`
      : '';
  const currentUrl = `${normalizedPath}${search}`;

  return `${localePrefix}/auth/login?redirect=${encodeURIComponent(currentUrl)}`;
}

export function isAuthPath(pathname: string): boolean {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return /^\/auth(?:\/|$)/.test(normalizedPath) ||
    /^\/(?:ar|en)\/auth(?:\/|$)/.test(normalizedPath);
}
