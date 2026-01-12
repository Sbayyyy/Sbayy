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
    // Proxy /api requests to backend API container
    return [
      { 
        source: "/api/:path*", 
        destination: "http://api:8080/api/:path*" 
      }
    ];
  }
};

module.exports = nextConfig;
