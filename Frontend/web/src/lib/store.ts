import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@sbay/shared';
import {
  clearAuthSession,
  getStoredAccessToken,
  storeAuthSession
} from './auth-session';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  /**
   * Stores the authenticated user and access token, optionally stores the refresh token for session renewal, and marks the user authenticated.
   * @param user Authenticated user profile returned by the API.
   * @param token JWT access token used by API requests.
   * @param refreshToken Optional refresh token used to renew expired access tokens.
   * @returns void
   */
  login: (user: User, token: string, refreshToken?: string | null) => void;
  /**
   * Clears stored authentication tokens and resets the authenticated user state.
   * @returns void
   */
  logout: () => void;
  /**
   * Replaces the current authenticated user profile in state.
   * @param user Updated user profile.
   * @returns void
   */
  setUser: (user: User) => void;
  /**
   * Marks the auth store as hydrated after persisted state and local storage are read.
   * @returns void
   */
  setHasHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,
      login: (user, token, refreshToken) => {
        storeAuthSession({ token, refreshToken });
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        clearAuthSession();
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
      // Only persist user info, not token (token in localStorage is source of truth)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Rehydrate token from localStorage on load
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          const token = getStoredAccessToken();
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
