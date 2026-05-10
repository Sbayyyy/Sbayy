import { api } from '@/lib/api';

export interface SponsoredAd {
  id: string;
  type: 'ad';
  title: string;
  description: string;
  imageUrl?: string;
  ctaText: string;
  targetUrl: string;
  priority: number;
  impressions: number;
  clicks: number;
}

export const getSponsoredAds = async (): Promise<SponsoredAd[]> => {
  const response = await api.get<SponsoredAd[]>('/ads');
  return response.data;
};

export const trackAdImpression = async (id: string): Promise<void> => {
  await api.post(`/ads/${id}/impression`);
};

export const trackAdClick = async (id: string): Promise<void> => {
  await api.post(`/ads/${id}/click`);
};
