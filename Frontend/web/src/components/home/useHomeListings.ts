import { useCallback, useEffect, useState } from 'react';
import type { Product } from '@sbay/shared';
import { getAllListings } from '@/lib/api/listings';
import { getRecommendedListings } from '@/lib/api/recommendations';

const HOME_PAGE_SIZE = 16;
const RECOMMENDED_LIMIT = 8;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const scheduleIdleWork = (callback: () => void) => {
  if (typeof window === 'undefined') return undefined;

  const idleWindow = window as IdleWindow;
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 1500 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(callback, 600);
  return () => window.clearTimeout(handle);
};

export function useHomeListings() {
  const [browseProducts, setBrowseProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [browsePage, setBrowsePage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadHomeProducts = useCallback(async () => {
    try {
      const data = await getAllListings(1, HOME_PAGE_SIZE);
      const products = data?.items ?? [];
      setFeaturedProducts(products.filter(product => product.isBoosted));
      setBrowseProducts(products.filter(product => !product.isBoosted));
      setHasMore((data?.page ?? 1) < (data?.totalPages ?? 1));
      setBrowsePage(1);
    } catch (err) {
      console.error('Error loading home products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecommended = useCallback(async () => {
    try {
      const items = await getRecommendedListings(RECOMMENDED_LIMIT);
      setRecommendedProducts(items);
    } catch (err) {
      console.error('Error loading recommended products:', err);
      setRecommendedProducts([]);
    }
  }, []);

  useEffect(() => {
    void loadHomeProducts();
  }, [loadHomeProducts]);

  useEffect(() => {
    return scheduleIdleWork(() => void loadRecommended());
  }, [loadRecommended]);

  const loadMoreBrowse = useCallback(async () => {
    if (loadingMore) return;

    setLoadingMore(true);
    try {
      const nextPage = browsePage + 1;
      const data = await getAllListings(nextPage, HOME_PAGE_SIZE);
      const products = data?.items ?? [];

      setBrowseProducts(prev => {
        const existingIds = new Set(prev.map(product => product.id));
        const newItems = products.filter(product => !product.isBoosted && !existingIds.has(product.id));
        return [...prev, ...newItems];
      });

      const more = (data?.page ?? nextPage) < (data?.totalPages ?? nextPage);
      setHasMore(more && products.length > 0);
      setBrowsePage(nextPage);
    } catch (err) {
      console.error('Error loading more products:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [browsePage, loadingMore]);

  return {
    browseProducts,
    featuredProducts,
    recommendedProducts,
    loading,
    loadingMore,
    hasMore,
    loadMoreBrowse,
  };
}
