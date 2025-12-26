import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        // Store in both localStorage (for API interceptor) and Zustand (for React state)
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        // Clear both storage locations
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
        set({ user: null, token: null, isAuthenticated: false });
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
          const token = localStorage.getItem('token');
          if (token) {
            state.token = token;
            state.isAuthenticated = true;
          } else {
            state.isAuthenticated = false;
          }
        }
      },
    }
  )
);
