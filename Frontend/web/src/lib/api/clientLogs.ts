import { api } from '../api';

export type ClientLogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export type ClientLogPayload = {
  level?: ClientLogLevel;
  source?: string;
  message: string;
  exceptionType?: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
  appVersion?: string;
  platform?: string;
  deviceId?: string;
  requestId?: string;
  url?: string;
};

export type ClientLog = {
  id: string;
  userId?: string | null;
  level: ClientLogLevel;
  source: string;
  message: string;
  exceptionType?: string | null;
  stackTrace?: string | null;
  contextJson?: string | null;
  appVersion?: string | null;
  platform?: string | null;
  deviceId?: string | null;
  requestId?: string | null;
  userAgent?: string | null;
  url?: string | null;
  createdAt: string;
};

export type ClientLogsPage = {
  items: ClientLog[];
  total: number;
  page: number;
  limit: number;
};

export type ClientLogSummary = {
  total: number;
  last24Hours: number;
  errors: number;
  warnings: number;
  critical: number;
  sources: { source: string; count: number }[];
};

export async function createClientLog(payload: ClientLogPayload): Promise<ClientLog> {
  const response = await api.post<ClientLog>('/client-logs', payload);
  return response.data;
}

export async function getClientLogs(params: {
  level?: string;
  source?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<ClientLogsPage> {
  const response = await api.get<ClientLogsPage>('/admin/client-logs', { params });
  return response.data;
}

export async function getClientLogSummary(): Promise<ClientLogSummary> {
  const response = await api.get<ClientLogSummary>('/admin/client-logs/summary');
  return response.data;
}
