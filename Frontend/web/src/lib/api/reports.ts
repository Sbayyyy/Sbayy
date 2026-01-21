import { api } from '../api';

export type ReportPayload = {
  targetType: 'UserProfile' | 'Listing' | 'Message';
  targetId: string;
  reason: 'Spam' | 'Harassment' | 'Scam' | 'Inappropriate' | 'Other';
  description?: string | null;
  evidenceUrls?: string[];
  blockUser?: boolean;
};

export const createReport = async (payload: ReportPayload) => {
  const response = await api.post('/reports', payload);
  return response.data;
};
