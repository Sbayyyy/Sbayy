/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  reactStrictMode: true,
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  i18n,
  images: {
    domains: ['localhost', 'api.syrian-bay.com'],
    remotePatterns: [
      { protocol: 'https', hostname: 'api.syrian-bay.com', pathname: '/**' },
      { protocol: 'https', hostname: 'syrian-bay.com', pathname: '/**' },
      { protocol: 'https', hostname: 'sbay.sy', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
    ],
  },
  transpilePackages: ['@sbay/shared'],
  webpack(config, { dev }) {
    if (dev && config.cache) {
      config.cache = false;
    }
    return config;
  },
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

const sentryOptions = {
  silent: true,
};

module.exports = withSentryConfig(nextConfig, sentryOptions);
