import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import '@/styles/globals.css';
// import CartSidebar from '@/components/CartSidebar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastContainer } from '@/lib/toast';
import { appWithTranslation } from 'next-i18next';
import { ClientLogger } from '@/lib/clientLogger';
import { useAuthStore } from '@/lib/store';

const SUPPORTED_LOCALES = ['ar', 'en'] as const;

function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());
  const user = useAuthStore(state => state.user);
  const router = useRouter();

  useEffect(() => {
    ClientLogger.init();
  }, []);

  useEffect(() => {
    ClientLogger.setUser(user ? { id: user.id, email: user.email } : null);
  }, [user]);

  // Honor the NEXT_LOCALE cookie by redirecting to the matching locale route.
  // Updating i18n alone (without router) desynchronizes router.locale from the
  // rendered language and breaks the language toggle, so we go through router.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);
    const cookieLocale = match ? decodeURIComponent(match[1]) : null;
    if (!cookieLocale || !SUPPORTED_LOCALES.includes(cookieLocale as typeof SUPPORTED_LOCALES[number])) return;
    if (router.locale === cookieLocale) return;
    void router.replace(router.asPath, undefined, { locale: cookieLocale, scroll: false });
  }, [router]);

  // Keep <html lang> and <html dir> aligned with the active locale on client-side
  // route changes — Next.js doesn't sync these after the initial SSR.
  useEffect(() => {
    if (typeof document === 'undefined' || !router.locale) return;
    document.documentElement.lang = router.locale;
    document.documentElement.dir = router.locale === 'ar' ? 'rtl' : 'ltr';
  }, [router.locale]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
      {/* Cart feature disabled */}
      {/* <CartSidebar /> */}
      <ToastContainer />
    </QueryClientProvider>
  );
}

export default appWithTranslation(App);
