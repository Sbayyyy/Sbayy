import axios from 'axios';
import type { Product } from '@sbay/shared';
import type { SearchResponse } from '@sbay/shared';
import { normalizeListingsResponse } from './transforms';

/**
 * Server-side API client for SSR (`getServerSideProps`, `getStaticProps`).
 *
 * The browser-side client (`./api`) points at `/api` and relies on the Next.js
 * rewrite to reach the backend. From the Node process running SSR, `/api`
 * would loop back to Next itself. We resolve the backend's *internal* URL
 * from env so SSR requests skip the proxy entirely.
 */

function resolveServerBaseUrl(): string {
  const raw =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8080';
  const trimmed = raw.replace(/\/+$/, '');
  if (trimmed.startsWith('/')) {
    // Relative paths can't be called server-side. Bail to localhost for dev.
    return 'http://localhost:8080/api';
  }
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const baseUrl = resolveServerBaseUrl();

const serverApi = axios.create({
  baseURL: baseUrl,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

/** Server-side fetch for a single listing by UUID. Returns null on 404 / network error. */
export async function fetchListingByIdSSR(id: string): Promise<Product | null> {
  try {
    const response = await serverApi.get<Product>(`/listings/${id}`);
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    console.error('[ssr] failed to fetch listing', id, err);
    return null;
  }
}

/**
 * Server-side fetch for a page of listings. Used by the sitemap generator.
 * Falls back to an empty page when the backend is unreachable so the build
 * doesn't fail just because the API is briefly offline.
 */
export async function fetchListingsPageSSR(
  page: number,
  pageSize: number,
  filters: Record<string, string | number | boolean | undefined> = {}
): Promise<SearchResponse | null> {
  try {
    const response = await serverApi.get('/listings', { params: { page, pageSize, ...filters } });
    return normalizeListingsResponse(response.data, page, pageSize);
  } catch (err) {
    console.error('[ssr] failed to fetch listings page', page, err);
    return null;
  }
}
