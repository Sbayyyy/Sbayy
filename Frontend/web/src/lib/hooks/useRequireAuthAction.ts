import { useRouter } from 'next/router';
import { getLocalizedLoginRedirect } from '@/lib/auth-redirect';
import { useAuthStore } from '@/lib/store';

/**
 * Hook for action-level auth guards on public pages.
 * Returns a function that checks auth and redirects to login if needed.
 *
 * Usage:
 *   const requireAuth = useRequireAuthAction();
 *   const handleClick = () => {
 *     if (!requireAuth()) return;
 *     // ... protected action
 *   };
 */
export function useRequireAuthAction() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  return (): boolean => {
    if (isAuthenticated) return true;
    router.push(getLocalizedLoginRedirect(router.asPath, '', router.locale));
    return false;
  };
}
