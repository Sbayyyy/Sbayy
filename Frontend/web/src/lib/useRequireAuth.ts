import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/store';

export function useRequireAuth(): boolean {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!router.isReady || !hasHydrated) return;
    if (isAuthenticated) return;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('authRedirect', router.asPath);
    }
    const redirectTo = encodeURIComponent(router.asPath);
    router.replace(`/auth/login?redirect=${redirectTo}`);
  }, [hasHydrated, isAuthenticated, router.asPath, router.isReady, router.replace]);

  return isAuthenticated;
}
