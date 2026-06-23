const SUPPORTED_LOCALES = ['ar', 'en'] as const;
const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);
const DEFAULT_LOCALE = 'ar';
const SUPPORTED_LOCALE_PATTERN = SUPPORTED_LOCALES
  .map(locale => locale.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const LOCALIZED_AUTH_PATH_PATTERN = new RegExp(`^/(?:${SUPPORTED_LOCALE_PATTERN})/auth(?:/|$)`);

/**
 * Builds a login redirect URL while preserving the active locale and current path.
 *
 * @param pathname - Current route pathname, with or without a leading slash.
 * @param search - Current query string to preserve in the redirect target.
 * @param locale - Optional active locale when the pathname has no locale prefix.
 * @returns A localized login URL with the current URL encoded in the redirect parameter.
 */
export function getLocalizedLoginRedirect(pathname: string, search: string = '', locale?: string | null): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const firstSegment = normalizedPath.split('/')[1];
  const localePrefix = SUPPORTED_LOCALE_SET.has(firstSegment)
    ? `/${firstSegment}`
    : locale && SUPPORTED_LOCALE_SET.has(locale) && locale !== DEFAULT_LOCALE
      ? `/${locale}`
      : '';
  const currentUrl = `${normalizedPath}${search}`;

  return `${localePrefix}/auth/login?redirect=${encodeURIComponent(currentUrl)}`;
}

/**
 * Returns true when a path points at an authentication route, with or without a locale prefix.
 *
 * @param pathname - Route pathname to inspect.
 * @returns Whether the path is an auth route.
 */
export function isAuthPath(pathname: string): boolean {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return /^\/auth(?:\/|$)/.test(normalizedPath) ||
    LOCALIZED_AUTH_PATH_PATTERN.test(normalizedPath);
}
