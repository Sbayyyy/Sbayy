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
