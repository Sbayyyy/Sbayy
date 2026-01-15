import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import '@/styles/globals.css';
import CartSidebar from '@/components/CartSidebar';
import { ToastContainer } from '@/lib/toast';
import { appWithTranslation } from 'next-i18next';
import { i18n as i18nextInstance } from 'next-i18next';

function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());
  
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);
    const cookieLocale = match ? decodeURIComponent(match[1]) : null;
    const ensureLocaleLoaded = async (locale: string) => {
      if (!i18nextInstance) return;
      const canCheck = typeof i18nextInstance.hasResourceBundle === 'function';
      if (canCheck && i18nextInstance.hasResourceBundle(locale, 'common')) return;
      if (typeof i18nextInstance.addResourceBundle !== 'function') return;
      const response = await fetch(`/locales/${locale}/common.json`);
      if (!response.ok) return;
      const resources = await response.json();
      i18nextInstance.addResourceBundle(locale, 'common', resources, true, true);
    };

    const applyLocale = async (locale: string) => {
      await ensureLocaleLoaded(locale);
      i18nextInstance?.changeLanguage?.(locale);
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    };

    if (cookieLocale && i18nextInstance?.language !== cookieLocale) {
      void applyLocale(cookieLocale);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      <CartSidebar />
      <ToastContainer />
    </QueryClientProvider>
  );
}

export default appWithTranslation(App);
