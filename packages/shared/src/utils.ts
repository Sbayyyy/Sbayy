/**
 * Format price with Syrian Pound currency
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ar-SY', {
    style: 'currency',
    currency: 'SYP',
    minimumFractionDigits: 0,
  }).format(price);
};

/**
 * Format date in Arabic
 */
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('ar-SY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Syrian format)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+?963|0)?9\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Generate slug from text
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Validate username and return error message in Arabic
 */
export const getUsernameValidationMessage = (username: string): string | null => {
  if (!username) {
    return 'اسم المستخدم مطلوب';
  }
  if (username.length < 3) {
    return 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
  }
  if (username.length > 20) {
    return 'اسم المستخدم يجب أن لا يتجاوز 20 حرفاً';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'اسم المستخدم يجب أن يحتوي على حروف وأرقام فقط';
  }
  return null;
};

/**
 * Validate email and return error message in Arabic
 */
export const getEmailValidationMessage = (email: string): string | null => {
  if (!email) {
    return 'عنوان البريد الإلكتروني مطلوب';
  }
  if (!isValidEmail(email)) {
    return 'عنوان البريد الإلكتروني غير صالح';
  }
  return null;
};

/**
 * Validate phone number and return error message in Arabic
 */
export const getPhoneValidationMessage = (phone: string): string | null => {
  if (!phone) {
    return 'رقم الهاتف مطلوب';
  }
  if (!isValidPhone(phone)) {
    return 'رقم الهاتف غير صالح (مثال: 0912345678)';
  }
  return null;
};

/**
 * Check password strength and return error message in Arabic
 */
export const getPasswordStrengthMessage = (password: string): string | null => {
  if (!password) {
    return 'كلمة المرور مطلوبة';
  }
  if (password.length < 8) {
    return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
  }
  if (!/[A-Z]/.test(password)) {
    return 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل';
  }
  if (!/[a-z]/.test(password)) {
    return 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل';
  }
  if (!/[0-9]/.test(password)) {
    return 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل';
  }
  return null;
};

/**
 * Check if passwords match
 */
export const passwordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};
