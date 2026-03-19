import { api } from '../api';
import type {
  OrderResponse as Order,
  OrderCreate,
  Address,
  ShippingInfo,
  CalculateShippingRequest
} from '@sbay/shared';

/**
 * Calculate Shipping Cost
 *
 * Berechnet DHL Versandkosten basierend auf Stadt und Items
 *
 * TODO (Mo's Backend):
 * - Endpoint: POST /api/shipping/calculate
 * - Input: city, items (with weights)
 * - Output: cost, carrier, estimatedDays, trackingUrl
 */
export const calculateShipping = async (request: CalculateShippingRequest): Promise<ShippingInfo> => {
  const response = await api.post<ShippingInfo>('/shipping/calculate', request);
  return response.data;
};

/**
 * Create Order
 *
 * Erstellt neue Bestellung mit allen Details (Adresse, Items, Zahlungsmethode)
 *
 * TODO (Mo's Backend):
 * - Endpoint: POST /api/orders
 * - Input: OrderCreate (items, shippingAddress, paymentMethod, shippingCost, saveAddress)
 * - Output: Order with orderId, status='pending', timestamps, totals
 * - Auth: Requires JWT token (user ID from token)
 */
export const createOrder = async (data: OrderCreate): Promise<Order> => {
  const response = await api.post<Order>('/orders', data);
  return response.data;
};

/**
 * Get Order Details
 *
 * Ruft komplette Bestelldetails ab (Items, Status, Tracking Info)
 *
 * TODO (Mo's Backend):
 * - Endpoint: GET /api/orders/:orderId
 * - Output: Complete Order with items, shipping address, status, tracking
 * - Auth: Requires JWT (user must be order owner or seller)
 */
export const getOrder = async (orderId: string): Promise<Order> => {
  const response = await api.get<Order>(`/orders/${orderId}`);
  return response.data;
};

/**
 * Get User's Purchases (as Buyer)
 *
 * Ruft alle Bestellungen des aktuellen Users als Käufer ab
 *
 * TODO (Mo's Backend):
 * - Endpoint: GET /api/orders/my-purchases
 * - Pagination: page, limit query params
 * - Output: Order[] (filtered by user ID from token)
 * - Auth: Requires JWT token
 */
export const getPurchases = async (page = 1, limit = 20): Promise<{ orders: Order[]; total: number }> => {
  const response = await api.get<{ orders: Order[]; total: number }>('/orders/my-purchases', {
    params: { page, limit }
  });
  return response.data;
};

/**
 * Get User's Sales (as Seller)
 *
 * Ruft alle verkauften Items/Orders des aktuellen Users als Verkäufer ab
 *
 * TODO (Mo's Backend):
 * - Endpoint: GET /api/orders/my-sales
 * - Pagination: page, limit query params
 * - Output: Order[] (filtered by seller from items, seller ID from token)
 * - Auth: Requires JWT token (seller role)
 */
export const getSales = async (page = 1, limit = 20): Promise<{ orders: Order[]; total: number }> => {
  const response = await api.get<{ orders: Order[]; total: number }>('/orders/my-sales', {
    params: { page, limit }
  });
  return response.data;
};

/**
 * Update Order Status (Admin/Seller only)
 *
 * TODO (Mo's Backend):
 * - Endpoint: PATCH /api/orders/:orderId/status
 * - Input: { status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' }
 * - Auth: Requires JWT + seller/admin role
 */
export const updateOrderStatus = async (
  orderId: string,
  status: 'pending' | 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
): Promise<Order> => {
  const response = await api.patch<Order>(`/orders/${orderId}/status`, { status });
  return response.data;
};

/**
 * Cancel Order
 *
 * TODO (Mo's Backend):
 * - Endpoint: DELETE /api/orders/:orderId
 * - Only allows if order status is 'pending'
 * - Auth: Requires JWT (buyer must be order owner)
 */
export const cancelOrder = async (orderId: string): Promise<void> => {
  await api.delete(`/orders/${orderId}`);
};

/**
 * Export all order API functions
 */
export const ordersApi = {
  calculateShipping,
  createOrder,
  getOrder,
  getPurchases,
  getSales,
  updateOrderStatus,
  cancelOrder
};

export default ordersApi;
