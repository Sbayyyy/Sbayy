import { api } from '../api';

export type BugReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export type BugReportPayload = {
  title: string;
  description: string;
  pageUrl?: string;
  steps?: string;
  expected?: string;
  actual?: string;
  severity?: BugReportSeverity;
  browser?: string;
  userAgent?: string;
};

export type BugReportResponse = {
  id: string;
  createdAt: string;
};

export const createBugReport = async (payload: BugReportPayload) => {
  const response = await api.post<BugReportResponse>('/bug-reports', payload);
  return response.data;
};
