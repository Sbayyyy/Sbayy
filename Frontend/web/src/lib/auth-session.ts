import axios from 'axios';
import config from './config';

type AuthSession = {
  token: string;
  refreshToken?: string | null;
};

let inflightRefresh: Promise<AuthSession> | null = null;

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function storeAuthSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('token', session.token);
  if (session.refreshToken) {
    localStorage.setItem('refreshToken', session.refreshToken);
  } else {
    localStorage.removeItem('refreshToken');
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
}

export async function refreshStoredAuthSession(): Promise<AuthSession | null> {
  if (inflightRefresh) return inflightRefresh;

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  inflightRefresh = axios
    .post<AuthSession>(
      `${config.apiUrl}/auth/refresh`,
      { refreshToken },
      { timeout: config.apiTimeout },
    )
    .then((response) => {
      storeAuthSession(response.data);
      return response.data;
    })
    .finally(() => {
      inflightRefresh = null;
    });

  return inflightRefresh;
}

export async function revokeStoredRefreshToken(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return;

  await axios.post(
    `${config.apiUrl}/auth/logout`,
    { refreshToken },
    { timeout: config.apiTimeout },
  );
}

export function resetAuthSessionRefreshForTests(): void {
  inflightRefresh = null;
}
