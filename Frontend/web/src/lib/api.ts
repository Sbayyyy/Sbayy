import axios, { AxiosError } from 'axios';
import config from './config';

const api = axios.create({
  baseURL: config.apiUrl,
  timeout: config.apiTimeout,
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
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const originalRequest = error.config;
      if (!originalRequest) return Promise.reject(error);

      // Handle 401 Unauthorized - Token refresh
      if (error.response?.status === 401 && !(originalRequest as any)._retry) {
        (originalRequest as any)._retry = true;
        const refreshToken = localStorage.getItem('refreshToken');

        if (refreshToken) {
          try {
            const response = await axios.post('/api/auth/refresh', { refreshToken });
            const { token } = response.data;

            localStorage.setItem('token', token);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            
            return api.request(originalRequest);
          } catch (refreshError) {
            // Refresh failed - logout
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
              window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
            }
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token - logout
          localStorage.removeItem('token');
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
            window.location.href = '/auth/login';
          }
        }
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
