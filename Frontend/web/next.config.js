/** @type {import('next').NextConfig} */
const path = require('path');
const { i18n } = require('./next-i18next.config');
const { withSentryConfig } = require("@sentry/nextjs");

const defaultImageHosts = [
  'api.syrian-bay.com',
  'syrian-bay.com',
  'sbay.sy',
  'localhost',
  'localhost:8080',
  '127.0.0.1',
  '127.0.0.1:8080',
  'jfbajkvedcvkionsjbkl.supabase.co',
];

const configuredImageHosts = (process.env.NEXT_PUBLIC_OPTIMIZED_IMAGE_HOSTS || '')
  .split(',')
  .map((host) => {
    const value = host.trim();
    if (!value) return '';

    try {
      const url = new URL(value.includes('://') ? value : `https://${value}`);
      return `${url.hostname}${url.port ? `:${url.port}` : ''}`;
    } catch {
      return value.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    }
  })
  .filter(Boolean);

const imageRemotePatterns = [...new Set([...defaultImageHosts, ...configuredImageHosts])]
  .flatMap((host) => {
    const [hostname, port] = host.split(':');
    const remotePattern = (protocol) => ({
      protocol,
      hostname,
      ...(port ? { port } : {}),
      pathname: '/**',
    });

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return [
        remotePattern('http'),
        remotePattern('https'),
      ];
    }

    return [remotePattern('https')];
  });

const nextConfig = {
  reactStrictMode: true,
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  outputFileTracingRoot: path.join(__dirname, '..'),
  i18n,
  images: {
    remotePatterns: imageRemotePatterns,
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
      },
      {
        source: "/uploads/:path*",
        destination: `${apiProxyTarget}/uploads/:path*`
      }
    ];
  }
};

const sentryOptions = {
  silent: true,
};

module.exports = withSentryConfig(nextConfig, sentryOptions);
