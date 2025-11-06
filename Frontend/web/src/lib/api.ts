import axios from 'axios';

const api = axios.create({
  baseURL: '/api', 
  headers: { 'Content-Type': 'application/json' },
});

if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  api.interceptors.response.use(
    (res) => res,
    async (error) => {
      if (error?.response?.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');

        if (refreshToken && !error.config._retry) {
          error.config._retry = true;
          try {
            const response = await axios.post('/api/auth/refresh', { refreshToken });
            const { token } = response.data;

            localStorage.setItem('token', token);

            error.config.headers.Authorization = `Bearer ${token}`;
            return api.request(error.config);
          } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }

      return Promise.reject(error);
    }
  );
}

export default api;
export { api };
