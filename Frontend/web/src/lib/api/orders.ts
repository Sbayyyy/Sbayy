import { api } from '../api';
import type {
  OrderResponse as Order,
  OrderCreate,
  ShippingInfo,
  CalculateShippingRequest
} from '@sbay/shared';

type BackendOrderItem = {
  id?: string;
  listingId?: string;
  productId?: string;
  quantity: number;
  priceAmount?: number;
  price?: number;
  priceCurrency?: string;
};

type BackendOrder = Omit<Partial<Order>, 'items'> & {
  items?: BackendOrderItem[];
  totalAmount?: number;
  totalCurrency?: string;
  status?: string;
  shippingInfo?: Partial<ShippingInfo>;
};

const normalizeStatus = (status?: string): Order['status'] => {
  switch ((status ?? 'pending').toLowerCase()) {
    case 'paid':
    case 'processing':
    case 'confirmed':
      return 'confirmed';
    case 'completed':
    case 'delivered':
      return 'delivered';
    case 'shipped':
      return 'shipped';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    default:
      return 'pending';
  }
};

const toBackendStatus = (status: 'pending' | 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled') => {
  if (status === 'confirmed') return 'paid';
  if (status === 'delivered') return 'completed';
  return status;
};

const normalizeOrder = (order: BackendOrder): Order => {
  const items = (order.items ?? []).map(item => {
    const productId = item.productId ?? item.listingId ?? item.id ?? '';
    const price = item.price ?? item.priceAmount ?? 0;
    return {
      productId,
      listingId: item.listingId ?? productId,
      quantity: item.quantity,
      price,
      priceAmount: item.priceAmount ?? price,
      priceCurrency: item.priceCurrency ?? order.totalCurrency ?? 'SYP'
    };
  });
  const shippingInfo: Partial<ShippingInfo> = order.shippingInfo ?? {};
  const shippingCost = Number(shippingInfo.cost ?? 0);
  const total = Number(order.total ?? order.totalAmount ?? 0);
  const subtotal = Number(order.subtotal ?? Math.max(total - shippingCost, 0));

  return {
    ...(order as Order),
    items,
    status: normalizeStatus(order.status),
    total,
    subtotal,
    shippingInfo: {
      cost: shippingCost,
      carrier: shippingInfo.carrier === 'dhl' ? 'dhl' : 'other',
      estimatedDays: Number(shippingInfo.estimatedDays ?? 3),
      trackingNumber: shippingInfo.trackingNumber
    }
  };
};

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
  const payload = {
    ...data,
    sellerId: '00000000-0000-0000-0000-000000000000',
    items: data.items.map(item => ({
      listingId: item.listingId ?? item.productId,
      quantity: item.quantity,
      priceAmount: item.priceAmount ?? item.price ?? 0,
      priceCurrency: (item.priceCurrency ?? 'SYP').toUpperCase()
    }))
  };
  const response = await api.post<BackendOrder>('/orders', payload);
  return normalizeOrder(response.data);
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
  const response = await api.get<BackendOrder>(`/orders/${orderId}`);
  return normalizeOrder(response.data);
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
  const response = await api.get<{ orders: BackendOrder[]; total: number }>('/orders/my-purchases', {
    params: { page, limit }
  });
  return {
    orders: (response.data.orders ?? []).map(normalizeOrder),
    total: response.data.total
  };
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
  const response = await api.get<{ orders: BackendOrder[]; total: number }>('/orders/my-sales', {
    params: { page, limit }
  });
  return {
    orders: (response.data.orders ?? []).map(normalizeOrder),
    total: response.data.total
  };
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
  const response = await api.patch<BackendOrder>(`/orders/${orderId}/status`, { status: toBackendStatus(status) });
  return normalizeOrder(response.data);
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
