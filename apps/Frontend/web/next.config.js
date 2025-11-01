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
};

module.exports = nextConfig;
