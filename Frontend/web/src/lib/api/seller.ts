import { api } from '../api';
import { SellerStats, Order, DailyRevenue, WeeklySales } from '@sbay/shared';

/**
 * Seller Statistics abrufen
 */
export const getSellerStats = async (): Promise<SellerStats> => {
  const response = await api.get('/seller/stats');
  return response.data;
};

/**
 * Recent Orders abrufen
 */
export const getRecentOrders = async (limit = 10): Promise<Order[]> => {
  const response = await api.get('/seller/orders/recent', { params: { limit } });
  return response.data;
};

/**
 * Daily Revenue Data abrufen
 */
export const getDailyRevenue = async (days = 7): Promise<DailyRevenue[]> => {
  const response = await api.get('/seller/sales/daily', { params: { days } });
  return response.data;
};

/**
 * Weekly Sales Data abrufen
 */
export const getWeeklySales = async (weeks = 4): Promise<WeeklySales[]> => {
  const response = await api.get('/seller/sales/weekly', { params: { weeks } });
  return response.data;
};
