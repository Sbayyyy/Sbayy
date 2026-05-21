import { api } from '../api';

export type ContactPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  pageUrl?: string;
  userAgent?: string;
};

export type ContactResponse = {
  id: string;
  createdAt: string;
};

export const sendContactMessage = async (payload: ContactPayload) => {
  const response = await api.post<ContactResponse>('/contact', payload);
  return response.data;
};
