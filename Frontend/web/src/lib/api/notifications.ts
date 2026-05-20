import { api } from '@/lib/api';

export type NotificationPreferences = {
  emailNewBids: boolean;
  emailOutbidAlerts: boolean;
  emailWonAuctions: boolean;
  emailMessages: boolean;
  emailPriceDrops: boolean;
  emailPromotions: boolean;
  pushNewBids: boolean;
  pushOutbidAlerts: boolean;
  pushWonAuctions: boolean;
  pushMessages: boolean;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  emailNewBids: true,
  emailOutbidAlerts: true,
  emailWonAuctions: true,
  emailMessages: true,
  emailPriceDrops: true,
  emailPromotions: false,
  pushNewBids: true,
  pushOutbidAlerts: true,
  pushWonAuctions: true,
  pushMessages: false,
};

export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const response = await api.get<NotificationPreferences>('/notifications/preferences');
  return response.data;
};

export const updateNotificationPreferences = async (
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  const response = await api.put<NotificationPreferences>('/notifications/preferences', preferences);
  return response.data;
};
