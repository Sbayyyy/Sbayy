import { api } from '../api';

export interface DashboardUsers {
  total: number;
  active: number;
  blocked: number;
  deactivated: number;
  admins: number;
  sellers: number;
  unverified: number;
}

export interface DashboardListings {
  total: number;
  active: number;
  sold: number;
  hidden: number;
  deleted: number;
}

export interface DashboardChats {
  total: number;
  messages: number;
  unreadMessages: number;
}

export interface DashboardReports {
  total: number;
  open: number;
  reviewed: number;
  closed: number;
}

export interface DashboardOrders {
  total: number;
  pending: number;
  paid: number;
  shipped: number;
  completed: number;
  cancelled: number;
}

export interface DashboardNotifications {
  total: number;
  unread: number;
}

export interface DashboardCommerce {
  reviews: number;
  favorites: number;
  payments: number;
  sponsoredAds: number;
  activeSponsoredAds: number;
}

export interface DashboardBugReports {
  total: number | null;
  stored: boolean;
  note: string;
}

export interface AdminDashboardSummary {
  generatedAt: string;
  users: DashboardUsers;
  listings: DashboardListings;
  chats: DashboardChats;
  reports: DashboardReports;
  orders: DashboardOrders;
  notifications: DashboardNotifications;
  commerce: DashboardCommerce;
  bugReports: DashboardBugReports;
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const response = await api.get<AdminDashboardSummary>('/admin/dashboard/summary');
  return response.data;
}
