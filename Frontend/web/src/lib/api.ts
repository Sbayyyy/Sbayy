import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import config from './config';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: config.apiUrl,
  timeout: config.apiTimeout,
  withCredentials: true, // send auth_token cookie automatically
  headers: { 
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }
  return config;
});

// Request counter for retry logic
const MAX_RETRIES = config.maxRetries;
let requestRetries = new Map<string, number>();

// Log API calls in development
if (config.enableLogging) {
  api.interceptors.request.use((config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });
  
  api.interceptors.response.use(
    (response) => {
      console.log(`[API] ✓ ${response.config.method?.toUpperCase()} ${response.config.url}`);
      return response;
    },
    (error) => {
      console.error(`[API] ✗ ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.message);
      return Promise.reject(error);
    }
  );
}

if (typeof window !== 'undefined') {
  api.interceptors.response.use(
    (res) => {
      // Clean up retry counter on success
      const requestKey = `${res.config.method}:${res.config.url}`;
      requestRetries.delete(requestKey);
      return res;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryableRequestConfig | undefined;
      if (!originalRequest) return Promise.reject(error);

      // Handle 401 Unauthorized - cookie expired or invalid, redirect to login
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
        return Promise.reject(error);
      }

      // Handle network errors with retry
      if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        const requestKey = `${originalRequest.method}:${originalRequest.url}`;
        const retryCount = requestRetries.get(requestKey) || 0;

        if (retryCount < MAX_RETRIES) {
          requestRetries.set(requestKey, retryCount + 1);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          return api.request(originalRequest);
        } else {
          requestRetries.delete(requestKey);
        }
      }

      // Handle 500 errors
      if (error.response?.status && error.response.status >= 500) {
        console.error('Server error:', error.response.data);
      }

      return Promise.reject(error);
    }
  );
}

export default api;
export { api };
