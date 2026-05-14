import { renderHook, act } from '@testing-library/react';

// Mock zustand persist
jest.mock('zustand/middleware', () => ({
  persist: (fn: any) => fn,
}));

// We need to import after mocking
import { useAuthStore } from '@/lib/store';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,
    });
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should set user and token on login', () => {
      const { result } = renderHook(() => useAuthStore());

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        verified: true,
        createdAt: '2024-01-01',
      };

      act(() => {
        result.current.login(mockUser, 'test-token', 'test-refresh-token');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('test-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'test-refresh-token');
    });
  });

  describe('logout', () => {
    it('should clear user and token on logout', () => {
      const { result } = renderHook(() => useAuthStore());

      // First login
      act(() => {
        result.current.login(
          { id: '1', email: 'test@test.com', name: 'Test', verified: true, createdAt: '2024-01-01' },
          'token'
        );
      });

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('setUser', () => {
    it('should update user data', () => {
      const { result } = renderHook(() => useAuthStore());

      const newUser = {
        id: '2',
        email: 'updated@example.com',
        name: 'Updated User',
        verified: true,
        createdAt: '2024-01-01',
      };

      act(() => {
        result.current.setUser(newUser);
      });

      expect(result.current.user).toEqual(newUser);
    });
  });

  describe('setHasHydrated', () => {
    it('should set hasHydrated to true', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.hasHydrated).toBe(false);

      act(() => {
        result.current.setHasHydrated();
      });

      expect(result.current.hasHydrated).toBe(true);
    });
  });
});
