import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getLocalizedLoginRedirect } from '@/lib/auth-redirect';
import { useAuthStore } from '@/lib/store';

/**
 * Page-level auth guard.
 *
 * Redirects unauthenticated visitors to /auth/login with a redirect param
 * pointing back at the current path. Returns `undefined` while the auth
 * store / router are still hydrating — render a spinner while this is true.
 */
export function useRequireAuth(): boolean | undefined {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!router.isReady || !hasHydrated) return;
    if (isAuthenticated) return;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('authRedirect', router.asPath);
    }
    router.replace(getLocalizedLoginRedirect(router.asPath, '', router.locale));
  }, [hasHydrated, isAuthenticated, router.asPath, router.isReady, router.locale, router.replace]);

  if (!router.isReady || !hasHydrated) {
    return undefined;
  }

  return isAuthenticated;
}
