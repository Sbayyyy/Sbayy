import config from './config';

const absoluteUrlPattern = /^https?:\/\//i;
const defaultOptimizedImageHosts = [
  'api.syrian-bay.com',
  'syrian-bay.com',
  'sbay.sy',
  'localhost',
  'localhost:8080',
  '127.0.0.1',
  '127.0.0.1:8080',
  'jfbajkvedcvkionsjbkl.supabase.co',
];

const hostKey = (url: URL) => `${url.hostname}${url.port ? `:${url.port}` : ''}`.toLowerCase();

const configuredOptimizedImageHosts =
  process.env.NEXT_PUBLIC_OPTIMIZED_IMAGE_HOSTS?.split(',')
    .map(host => {
      const value = host.trim().toLowerCase();
      if (!value) return '';

      try {
        return hostKey(new URL(value.includes('://') ? value : `https://${value}`));
      } catch {
        return value.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      }
    })
    .filter(Boolean) ?? [];

const optimizedImageHosts = new Set([
  ...defaultOptimizedImageHosts,
  ...configuredOptimizedImageHosts,
]);

const apiOrigin = () => {
  if (config.apiUrl.startsWith('/')) return null;

  try {
    return new URL(config.apiUrl.replace(/\/api\/?$/, '')).origin;
  } catch {
    return null;
  }
};

const toSameOriginUploadPath = (value: string) => {
  try {
    const url = new URL(value);
    const origin = apiOrigin();
    const localUploadHost = ['localhost', 'localhost:8080', '127.0.0.1', '127.0.0.1:8080'].includes(hostKey(url));

    if (url.pathname.startsWith('/uploads/') && ((origin && url.origin === origin) || localUploadHost)) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    return value;
  } catch {
    return value;
  }
};

export function normalizeImageUrl(url?: string | null): string | null {
  const value = url?.trim();
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (absoluteUrlPattern.test(value)) return toSameOriginUploadPath(value);
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return value;
  if (value.startsWith('uploads/')) return `/${value}`;

  return `/${value}`;
}

export function shouldBypassNextImageOptimizer(src: string): boolean {
  if (src.startsWith('data:') || src.startsWith('blob:')) return true;
  if (src.startsWith('/')) return false;

  if (absoluteUrlPattern.test(src)) {
    try {
      return !optimizedImageHosts.has(hostKey(new URL(src)));
    } catch {
      return true;
    }
  }

  return false;
}
