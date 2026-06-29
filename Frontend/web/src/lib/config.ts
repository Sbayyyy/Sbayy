/**
 * Environment Configuration
 *
 * Centralized configuration for the application
 */

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: { apiUrl?: string; supportEmail?: string; logoUrl?: string; googleWebClientId?: string };
  }
}

interface Config {
  apiUrl: string;
  supportEmail: string;
  logoUrl: string;
  googleWebClientId: string;
  apiTimeout: number;
  maxRetries: number;
  isDevelopment: boolean;
  isProduction: boolean;
  enableLogging: boolean;
}

const normalizeApiUrl = (url: string) => {
  if (url.startsWith('/')) return url;
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const getConfig = (): Config => {
  const isDev = process.env.NODE_ENV === 'development';
  const runtimeApiUrl =
    typeof window !== 'undefined'
      ? window.__RUNTIME_CONFIG__?.apiUrl
      : process.env.RUNTIME_API_URL;
  const rawApiUrl = runtimeApiUrl || process.env.NEXT_PUBLIC_API_URL || '/api';
  const runtimeSupportEmail =
    typeof window !== 'undefined'
      ? window.__RUNTIME_CONFIG__?.supportEmail
      : process.env.RUNTIME_SUPPORT_EMAIL;
  const runtimeLogoUrl =
    typeof window !== 'undefined'
      ? window.__RUNTIME_CONFIG__?.logoUrl
      : process.env.RUNTIME_LOGO_URL;
  const runtimeGoogleWebClientId =
    typeof window !== 'undefined'
      ? window.__RUNTIME_CONFIG__?.googleWebClientId
      : process.env.RUNTIME_GOOGLE_WEB_CLIENT_ID;
  
  return {
    // API Configuration
    apiUrl: normalizeApiUrl(rawApiUrl),
    supportEmail: runtimeSupportEmail || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@syrian-bay.com',
    logoUrl: runtimeLogoUrl || process.env.NEXT_PUBLIC_LOGO_URL || '/assets/sbaylogo2.png',
    googleWebClientId: runtimeGoogleWebClientId || process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    apiTimeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.NEXT_PUBLIC_MAX_RETRIES || '3', 10),
    
    // Environment
    isDevelopment: isDev,
    isProduction: !isDev,
    enableLogging: isDev,
  };
};

export const config = getConfig();

// Feature Flags
export const features = {
  enableSignalR: process.env.NEXT_PUBLIC_ENABLE_SIGNALR === 'true',
  enablePWA: process.env.NEXT_PUBLIC_ENABLE_PWA === 'true',
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  // Google sign-in exists but is not live yet; gate it behind a "coming soon" flag.
  // Defaults to coming soon unless explicitly disabled.
  googleAuthComingSoon: process.env.NEXT_PUBLIC_GOOGLE_AUTH_COMING_SOON !== 'false',
};

// Validation Rules
export const validation = {
  minPasswordLength: 8,
  maxPasswordLength: 128,
  minNameLength: 2,
  maxNameLength: 100,
  maxDescriptionLength: 5000,
  maxCommentLength: 1000,
  maxImageSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

// Pagination Defaults
export const pagination = {
  defaultPageSize: 20,
  maxPageSize: 100,
};

// Cache TTL (in milliseconds)
export const cacheTTL = {
  short: 5 * 60 * 1000, // 5 minutes
  medium: 30 * 60 * 1000, // 30 minutes
  long: 24 * 60 * 60 * 1000, // 24 hours
};

export default config;
