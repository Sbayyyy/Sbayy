import { api } from '../api';
import type { Product } from '@sbay/shared';

export type InteractionType = 'view' | 'category_click' | 'favorite' | 'purchase';

/** Extract the top-level category slug from a categoryPath like "electronics/phones". */
const topLevelCategory = (categoryPath?: string): string =>
  (categoryPath ?? '').trim().split('/')[0].trim().toLowerCase();

/**
 * Record an interest signal. Fire-and-forget: only runs for logged-in users and
 * never throws (a failed track must not break the page).
 */
export const trackInteraction = async (category: string, type: InteractionType): Promise<void> => {
  const slug = topLevelCategory(category);
  if (!slug) return;
  if (typeof window !== 'undefined' && !localStorage.getItem('token')) return;
  try {
    await api.post('/recommendations/track', { category: slug, type });
  } catch {
    // ignore — tracking is best-effort
  }
};

/**
 * Fetch personalized listings for the current user. Returns [] when the user has
 * no interest data yet or is not logged in.
 */
export const getRecommendedListings = async (pageSize = 12): Promise<Product[]> => {
  if (typeof window !== 'undefined' && !localStorage.getItem('token')) return [];
  try {
    const response = await api.get<Product[]>('/recommendations/listings', {
      params: { pageSize },
    });
    return response.data ?? [];
  } catch {
    return [];
  }
};
