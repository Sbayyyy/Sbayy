/**
 * Environment Configuration
 * 
 * Centralized configuration for the application
 */

interface Config {
  apiUrl: string;
  apiTimeout: number;
  maxRetries: number;
  isDevelopment: boolean;
  isProduction: boolean;
  enableLogging: boolean;
}

const getConfig = (): Config => {
  const isDev = process.env.NODE_ENV === 'development';
  
  return {
    // API Configuration
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
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
