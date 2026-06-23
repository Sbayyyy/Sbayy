const getFallbackLocale = () => {
  if (typeof document === 'undefined') return 'en-US';
  return document.documentElement.lang?.startsWith('ar') ? 'ar' : 'en';
};

export function formatPrice(
  amount: number,
  locale: string = getFallbackLocale(),
  currency: string = 'SYP'
): string {
  const formatted = amount.toLocaleString(locale?.startsWith('ar') ? 'ar-SY' : 'en-US');
  return `${formatted} ${currency}`;
}

/**
 * Formats a date or date string as localized relative time, returning an empty string for invalid dates.
 *
 * @param value - Date object or parseable date string.
 * @param locale - Locale used for relative time formatting; falls back to the document language.
 * @returns A localized relative time string, or an empty string when the date is invalid.
 */
export function formatRelativeTime(value: string | Date, locale: string = getFallbackLocale()): string {
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return '';

  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];

  const rtf = new Intl.RelativeTimeFormat(locale?.startsWith('ar') ? 'ar' : 'en', {
    numeric: 'auto',
  });

  for (const [unit, unitSeconds] of units) {
    if (Math.abs(seconds) >= unitSeconds) {
      return rtf.format(Math.round(seconds / unitSeconds), unit);
    }
  }

  return rtf.format(0, 'minute');
}
