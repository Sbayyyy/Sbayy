import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Product, SearchFilters } from '@sbay/shared';
import { getSponsoredAds, type SponsoredAd } from '@/lib/api/ads';
import { getAllListings } from '@/lib/api/listings';
import { normalizeBrowseFilters } from './useBrowseFilters';

const CACHE_MAX_ENTRIES = 20;
const PAGE_SIZE = 20;

interface UseBrowseListingsOptions {
  filters: SearchFilters;
  debouncedQuery: string;
  loadErrorMessage: string;
}

export function useBrowseListings({ filters, debouncedQuery, loadErrorMessage }: UseBrowseListingsOptions) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sponsoredAds, setSponsoredAds] = useState<SponsoredAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const initialLoadRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { items: Product[]; hasMore: boolean }>>(new Map());
  const filtersForApi = useMemo(() => normalizeBrowseFilters(filters), [filters]);

  const loadProducts = useCallback(async (text = debouncedQuery) => {
    const cacheKey = JSON.stringify({ text, filters: filtersForApi });
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setProducts(cached.items);
      setHasMore(cached.hasMore);
      setPage(1);
      setError('');
      setLoading(false);
      initialLoadRef.current = false;
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setError('');
      if (initialLoadRef.current) setLoading(true);
      const data = await getAllListings(1, PAGE_SIZE, filtersForApi, text, controller.signal);
      if (controller.signal.aborted) return;

      const items = data.items || [];
      const moreAvailable = items.length >= PAGE_SIZE;
      cacheRef.current.set(cacheKey, { items, hasMore: moreAvailable });
      if (cacheRef.current.size > CACHE_MAX_ENTRIES) {
        const oldest = cacheRef.current.keys().next().value;
        if (oldest) cacheRef.current.delete(oldest);
      }

      setProducts(items);
      setHasMore(moreAvailable);
      setPage(1);
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'CanceledError' || err.name === 'AbortError')) return;
      console.error('Error loading products:', err);
      setError(loadErrorMessage);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setLoading(false);
      initialLoadRef.current = false;
    }
  }, [debouncedQuery, filtersForApi, loadErrorMessage]);

  useEffect(() => {
    void loadProducts(debouncedQuery);
  }, [debouncedQuery, loadProducts]);

  useEffect(() => {
    getSponsoredAds()
      .then(setSponsoredAds)
      .catch(() => setSponsoredAds([]));
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await getAllListings(nextPage, PAGE_SIZE, filtersForApi, debouncedQuery);
      setProducts(prev => [...prev, ...(data.items || [])]);
      setPage(nextPage);
      setHasMore(data.items.length >= PAGE_SIZE);
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [debouncedQuery, filtersForApi, hasMore, loadingMore, page]);

  const handleFavorite = useCallback((id: string) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(favorite => favorite !== id) : [...prev, id]
    );
  }, []);

  return {
    products,
    sponsoredAds,
    loading,
    error,
    hasMore,
    loadingMore,
    favorites,
    loadMore,
    loadProducts,
    handleFavorite,
  };
}
