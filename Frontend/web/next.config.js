/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  i18n,
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
