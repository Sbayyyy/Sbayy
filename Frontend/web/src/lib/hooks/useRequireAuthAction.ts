import { useRouter } from 'next/router';
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
    const redirectTo = encodeURIComponent(router.asPath);
    router.push(`/auth/login?redirect=${redirectTo}`);
    return false;
  };
}
