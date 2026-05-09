/**
 * Format a price amount with locale-aware number formatting.
 *
 * Uses 'ar-SY' for Arabic locale, 'en-US' otherwise.
 */
export function formatPrice(
  amount: number,
  locale: string = 'ar',
  currency: string = 'SYP'
): string {
  const formatted = amount.toLocaleString(locale === 'ar' ? 'ar-SY' : 'en-US');
  return `${formatted} ${currency}`;
}
