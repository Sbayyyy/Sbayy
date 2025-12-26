/**
 * API Error Types and Helpers
 */

export interface ApiError {
  message: string;
  statusCode?: number;
  field?: string;
  details?: any;
}

export class ApiException extends Error {
  statusCode?: number;
  field?: string;
  details?: any;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiException';
    this.statusCode = error.statusCode;
    this.field = error.field;
    this.details = error.details;
  }
}

/**
 * Extract error message from various error formats
 */
export function getErrorMessage(error: any): string {
  // Axios error
  if (error.response?.data) {
    const data = error.response.data;
    
    // Backend error format
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.errors) {
      // Validation errors array
      if (Array.isArray(data.errors)) {
        return data.errors.map((e: any) => e.message || e).join(', ');
      }
      // Validation errors object
      return Object.values(data.errors).flat().join(', ');
    }
  }

  // Network error
  if (error.code === 'ECONNABORTED') {
    return 'انتهت مهلة الطلب. تحقق من اتصالك بالإنترنت.';
  }
  
  if (error.message === 'Network Error') {
    return 'خطأ في الاتصال. تحقق من اتصالك بالإنترنت.';
  }

  // Status code messages
  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'طلب غير صالح. تحقق من البيانات المدخلة.';
      case 401:
        return 'غير مصرح. يرجى تسجيل الدخول.';
      case 403:
        return 'غير مسموح. ليس لديك صلاحية الوصول.';
      case 404:
        return 'غير موجود. العنصر المطلوب غير موجود.';
      case 409:
        return 'تعارض. العنصر موجود بالفعل.';
      case 422:
        return 'بيانات غير صالحة. تحقق من المدخلات.';
      case 429:
        return 'طلبات كثيرة. حاول مرة أخرى لاحقاً.';
      case 500:
        return 'خطأ في الخادم. حاول مرة أخرى لاحقاً.';
      case 503:
        return 'الخدمة غير متوفرة. حاول مرة أخرى لاحقاً.';
    }
  }

  // Generic error
  return error.message || 'حدث خطأ غير متوقع';
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: any): ApiException {
  const message = getErrorMessage(error);
  const statusCode = error.response?.status;
  const details = error.response?.data;

  return new ApiException({ message, statusCode, details });
}

/**
 * Retry helper for failed requests
 */
export async function retryRequest<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
}

/**
 * Check if error is network related
 */
export function isNetworkError(error: any): boolean {
  return (
    error.code === 'ECONNABORTED' ||
    error.message === 'Network Error' ||
    !error.response
  );
}

/**
 * Check if error is authentication related
 */
export function isAuthError(error: any): boolean {
  return error.response?.status === 401 || error.response?.status === 403;
}
