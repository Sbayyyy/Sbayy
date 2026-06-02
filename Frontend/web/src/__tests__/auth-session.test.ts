import axios from 'axios';
import {
  clearAuthSession,
  refreshStoredAuthSession,
  resetAuthSessionRefreshForTests,
  revokeStoredRefreshToken,
  storeAuthSession,
} from '@/lib/auth-session';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const post = mockedAxios.post as jest.Mock;

describe('web auth session storage', () => {
  beforeEach(() => {
    resetAuthSessionRefreshForTests();
    post.mockReset();
    (localStorage.getItem as jest.Mock).mockReset();
    (localStorage.setItem as jest.Mock).mockReset();
    (localStorage.removeItem as jest.Mock).mockReset();
  });

  it('stores access and refresh tokens together', () => {
    storeAuthSession({ token: 'access-token', refreshToken: 'refresh-token' });

    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'access-token');
    expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
  });

  it('removes stale refresh tokens when storing an access-token-only session', () => {
    storeAuthSession({ token: 'access-token', refreshToken: null });

    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'access-token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('clears both stored tokens', () => {
    clearAuthSession();

    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('rotates refresh tokens with one in-flight request for concurrent callers', async () => {
    (localStorage.getItem as jest.Mock).mockImplementation((key: string) =>
      key === 'refreshToken' ? 'old-refresh-token' : null,
    );
    post.mockResolvedValueOnce({
      data: {
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    });

    const [first, second] = await Promise.all([
      refreshStoredAuthSession(),
      refreshStoredAuthSession(),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      '/api/auth/refresh',
      { refreshToken: 'old-refresh-token' },
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
    expect(first).toEqual({ token: 'new-access-token', refreshToken: 'new-refresh-token' });
    expect(second).toEqual(first);
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'new-access-token');
    expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token');
  });

  it('does not refresh when no refresh token is stored', async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    await expect(refreshStoredAuthSession()).resolves.toBeNull();

    expect(post).not.toHaveBeenCalled();
  });

  it('sends the stored refresh token when revoking the session', async () => {
    (localStorage.getItem as jest.Mock).mockImplementation((key: string) =>
      key === 'refreshToken' ? 'refresh-token' : null,
    );
    post.mockResolvedValueOnce({ data: undefined });

    await revokeStoredRefreshToken();

    expect(post).toHaveBeenCalledWith(
      '/api/auth/logout',
      { refreshToken: 'refresh-token' },
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });
});
