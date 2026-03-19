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
        // HttpOnly cookie is set by the backend on login (primary auth mechanism).
        // We also store the token in localStorage ONLY for the SignalR WebSocket
        // connection, which requires the token in the query string and cannot use cookies.
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        // Clear localStorage token (used for SignalR only)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
        // Clear Zustand state
        set({ user: null, token: null, isAuthenticated: false });
        // The HttpOnly auth_token cookie is cleared server-side by POST /auth/logout.
        // api.ts calls this automatically when the user logs out.
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
      // Only persist user info, not token (HttpOnly cookie is the primary auth mechanism)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Rehydrate token from localStorage on load
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          const token = localStorage.getItem('token');
          if (token) {
            state.token = token;
            state.isAuthenticated = true;
          } else {
            state.isAuthenticated = false;
          }
          state.setHasHydrated();
        }
      },
    }
  )
);
