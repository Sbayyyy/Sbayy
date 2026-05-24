import { api } from '../api';

// Backend enums are serialized as numeric values (no JsonStringEnumConverter).
// These arrays map the numeric value to a human label and to the string name
// that the backend's Enum.TryParse accepts on write.
export const REPORT_TARGET_TYPES = ['UserProfile', 'Listing', 'Message'] as const;
export const REPORT_REASONS = ['Spam', 'Harassment', 'Scam', 'Inappropriate', 'Other'] as const;
export const REPORT_STATUSES = ['Open', 'Reviewed', 'Closed'] as const;
export const REPORT_ACTIONS = ['None', 'Warned', 'ContentRemoved', 'UserSuspended', 'UserBanned'] as const;

export interface AdminReport {
  id: string;
  reporterId: string;
  reportedUserId?: string | null;
  targetType: number;
  targetId: string;
  reason: number;
  description?: string | null;
  evidenceUrls: string[];
  blockRequested: boolean;
  status: number;
  action: number;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  adminNotes?: string | null;
  createdAt: string;
}

const labelFromIndex = (arr: readonly string[], index: number): string =>
  arr[index] ?? `Unknown (${index})`;

export const reportTargetTypeLabel = (v: number) => labelFromIndex(REPORT_TARGET_TYPES, v);
export const reportReasonLabel = (v: number) => labelFromIndex(REPORT_REASONS, v);
export const reportStatusLabel = (v: number) => labelFromIndex(REPORT_STATUSES, v);
export const reportActionLabel = (v: number) => labelFromIndex(REPORT_ACTIONS, v);

export async function getAdminReports(params?: {
  reportedUserId?: string;
  targetType?: string;
  reason?: string;
  status?: string;
  take?: number;
  skip?: number;
}) {
  const response = await api.get<AdminReport[]>('/reports/admin', { params });
  return response.data;
}

export async function updateAdminReport(
  id: string,
  payload: { status?: string; action?: string; adminNotes?: string }
) {
  const response = await api.patch<AdminReport>(`/reports/admin/${id}`, payload);
  return response.data;
}
