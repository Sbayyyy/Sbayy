import { api } from '../api';
import type { Review, ReviewCreate, ReviewUpdate, ReviewStats } from '@sbay/shared';

/**
 * Get reviews for a product
 * 
 * TODO (Backend):
 * - Endpoint: GET /api/reviews/product/:productId
 * - Pagination: page, limit
 * - Output: { reviews: Review[], stats: ReviewStats }
 */
export const getProductReviews = async (
  productId: string,
  page = 1,
  limit = 10
): Promise<{ reviews: Review[]; stats: ReviewStats; total: number }> => {
  try {
    const response = await api.get<{ reviews: Review[]; stats: ReviewStats; total: number }>(
      `/reviews/product/${productId}`,
      { params: { page, limit } }
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch reviews for product ${productId}:`, error);
    throw error;
  }
};

/**
 * Get reviews for a seller
 * 
 * TODO (Backend):
 * - Endpoint: GET /api/reviews/seller/:sellerId
 * - Pagination: page, limit
 * - Output: { reviews: Review[], stats: ReviewStats }
 */
export const getSellerReviews = async (
  sellerId: string,
  page = 1,
  limit = 10
): Promise<{ reviews: Review[]; stats: ReviewStats; total: number }> => {
  try {
    const response = await api.get<{ reviews: Review[]; stats: ReviewStats; total: number }>(
      `/reviews/seller/${sellerId}`,
      { params: { page, limit } }
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch reviews for seller ${sellerId}:`, error);
    throw error;
  }
};

/**
 * Create a new review
 * 
 * TODO (Backend):
 * - Endpoint: POST /api/reviews
 * - Input: ReviewCreate (productId/sellerId, orderId, rating, comment)
 * - Output: Review
 * - Auth: Requires JWT, must have purchased product
 */
export const createReview = async (data: ReviewCreate): Promise<Review> => {
  try {
    const response = await api.post<Review>('/reviews', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create review:', error);
    throw error;
  }
};

/**
 * Update own review
 * 
 * TODO (Backend):
 * - Endpoint: PATCH /api/reviews/:reviewId
 * - Input: ReviewUpdate (rating?, comment?)
 * - Output: Review
 * - Auth: Requires JWT, must be review owner
 */
export const updateReview = async (reviewId: string, data: ReviewUpdate): Promise<Review> => {
  try {
    const response = await api.patch<Review>(`/reviews/${reviewId}`, data);
    return response.data;
  } catch (error) {
    console.error(`Failed to update review ${reviewId}:`, error);
    throw error;
  }
};

/**
 * Delete own review
 * 
 * TODO (Backend):
 * - Endpoint: DELETE /api/reviews/:reviewId
 * - Auth: Requires JWT, must be review owner
 */
export const deleteReview = async (reviewId: string): Promise<void> => {
  try {
    await api.delete(`/reviews/${reviewId}`);
  } catch (error) {
    console.error(`Failed to delete review ${reviewId}:`, error);
    throw error;
  }
};

/**
 * Mark review as helpful
 * 
 * TODO (Backend):
 * - Endpoint: POST /api/reviews/:reviewId/helpful
 * - Toggles helpful state (add/remove)
 * - Output: { helpful: number, isHelpful: boolean }
 * - Auth: Requires JWT
 */
export const markReviewHelpful = async (reviewId: string): Promise<{ helpful: number; isHelpful: boolean }> => {
  try {
    const response = await api.post<{ helpful: number; isHelpful: boolean }>(
      `/reviews/${reviewId}/helpful`
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to mark review ${reviewId} as helpful:`, error);
    throw error;
  }
};

/**
 * Get user's own reviews
 * 
 * TODO (Backend):
 * - Endpoint: GET /api/reviews/my-reviews
 * - Auth: Requires JWT
 * - Output: Review[]
 */
export const getMyReviews = async (): Promise<Review[]> => {
  try {
    const response = await api.get<Review[]>('/reviews/my-reviews');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch my reviews:', error);
    throw error;
  }
};

/**
 * Export all review API functions
 */
export const reviewsApi = {
  getProductReviews,
  getSellerReviews,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  getMyReviews
};
