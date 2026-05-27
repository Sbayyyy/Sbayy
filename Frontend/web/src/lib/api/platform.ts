import { api } from '../api';

export interface PlatformStats {
  registeredUsers: number;
  activeListings: number;
  coveredRegions: number;
  completedTransactions: number;
}

export const getPlatformStats = async (): Promise<PlatformStats> => {
  const response = await api.get<PlatformStats>('/platform/stats');
  return response.data;
};
