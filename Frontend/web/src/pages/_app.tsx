import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import '@/styles/globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastContainer, toast } from '@/lib/toast';
import { appWithTranslation } from 'next-i18next';
import { i18n as i18nextInstance } from 'next-i18next';
import { getErrorMessage } from '@/lib/api/errors';

function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: (error: any) => {
        // Globally toast network errors or 500s for queries, to avoid silent failures when backend is down
        const isNetworkOr500 = error?.code === 'ECONNABORTED' || error?.message === 'Network Error' || error?.response?.status >= 500;
        if (isNetworkOr500) {
          toast.error(getErrorMessage(error));
        }
      }
    }),
    mutationCache: new MutationCache({
      onError: (error: any) => {
        // Also global toast for mutations if network/500 error 
        const isNetworkOr500 = error?.code === 'ECONNABORTED' || error?.message === 'Network Error' || error?.response?.status >= 500;
        if (isNetworkOr500) {
          toast.error(getErrorMessage(error));
        }
      }
    })
  }));
  
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
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
      <ToastContainer />
    </QueryClientProvider>
  );
}

export default appWithTranslation(App);
