import { api } from '@/lib/api';

export interface BoostOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
}

export interface PaymentTransaction {
  id: string;
  provider: string;
  providerReference?: string;
  purpose: string;
  status: string;
  amount: number;
  currency: string;
  checkoutUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SellerMonetizationSummary {
  activeBoosts: number;
  pendingPayments: number;
  totalPlatformFees: number;
  currency: string;
}

export const getBoostOptions = async (): Promise<BoostOption[]> => {
  const response = await api.get<BoostOption[]>('/monetization/boost-options');
  return response.data;
};

export const createBoostPayment = async (
  listingId: string,
  optionId: string,
  returnUrl?: string,
): Promise<PaymentTransaction> => {
  const response = await api.post<PaymentTransaction>(`/monetization/listings/${listingId}/boost`, {
    optionId,
    returnUrl,
  });
  return response.data;
};

export const getSellerMonetizationSummary = async (): Promise<SellerMonetizationSummary> => {
  const response = await api.get<SellerMonetizationSummary>('/monetization/seller-summary');
  return response.data;
};
