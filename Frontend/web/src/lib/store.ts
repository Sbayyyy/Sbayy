import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@sbay/shared';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setHasHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,
      login: (user, token) => {
        // HttpOnly cookie is set by the backend on login/register (primary auth).
        // Token is kept only in Zustand memory for SignalR; never persisted to
        // localStorage so it cannot be exfiltrated via XSS.
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        // Clear in-memory Zustand state.
        // The HttpOnly auth_token cookie is cleared server-side by POST /auth/logout.
        set({ user: null, token: null, isAuthenticated: false });
      },
      setUser: (user) => {
        set({ user });
      },
      setHasHydrated: () => {
        set({ hasHydrated: true });
      },
    }),
    {
      name: 'auth-storage',
      // Persist only user profile info; token stays in-memory only.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Token is intentionally NOT restored — it is ephemeral.
          // The HttpOnly cookie handles API auth on reload;
          // a fresh login is needed to re-obtain a SignalR token.
          state.setHasHydrated();
        }
      },
    }
  )
);
