/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  i18n: {
    locales: ['ar', 'en'],
    defaultLocale: 'ar',
  },
  images: {
    domains: ['localhost'],
  },
  transpilePackages: ['@sbay/shared'],
  async rewrites() {
    const apiProxyTarget = process.env.NEXT_PUBLIC_API_PROXY_TARGET || 'http://localhost:8080';
    // Proxy /api requests to backend API container
    return [
      { 
        source: "/api/:path*", 
        destination: `${apiProxyTarget}/api/:path*` 
      }
    ];
  }
};

module.exports = nextConfig;
