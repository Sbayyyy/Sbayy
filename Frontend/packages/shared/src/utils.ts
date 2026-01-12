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

// Am Ende der Datei hinzufügen:

/**
 * Validate listing title and return error message in Arabic
 */
export const getListingTitleValidationMessage = (title: string): string | null => {
  if (!title) return 'عنوان المنتج مطلوب';
  if (title.length < 5) return 'عنوان المنتج يجب أن يكون 5 أحرف على الأقل';
  if (title.length > 100) return 'عنوان المنتج يجب أن لا يتجاوز 100 حرف';
  return null;
};

/**
 * Validate listing description and return error message in Arabic
 */
export const getListingDescriptionValidationMessage = (description: string): string | null => {
  if (!description) return 'وصف المنتج مطلوب';
  if (description.length < 20) return 'وصف المنتج يجب أن يكون 20 حرفاً على الأقل';
  if (description.length > 5000) return 'وصف المنتج يجب أن لا يتجاوز 5000 حرف';
  return null;
};

/**
 * Validate listing price and return error message in Arabic
 */
export const getListingPriceValidationMessage = (price: number | string): string | null => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (!price && price !== 0) return 'سعر المنتج مطلوب';
  if (isNaN(numPrice)) return 'سعر المنتج يجب أن يكون رقماً';
  if (numPrice < 0) return 'سعر المنتج يجب أن يكون أكبر من أو يساوي صفر';
  if (numPrice > 999999999) return 'سعر المنتج مرتفع جداً';
  return null;
};

/**
 * Validate listing category and return error message in Arabic
 */
export const getListingCategoryValidationMessage = (category: string): string | null => {
  if (!category) return 'الفئة مطلوبة';
  return null;
};

/**
 * Validate listing location and return error message in Arabic
 */
export const getListingLocationValidationMessage = (location: string): string | null => {
  if (!location) return 'الموقع مطلوب';
  if (location.length < 2) return 'الموقع يجب أن يكون حرفين على الأقل';
  return null;
};

// ==================== CHECKOUT VALIDATIONS ====================

/**
 * Validate full name and return error message in Arabic
 */
export const getNameValidationMessage = (name: string): string | null => {
  if (!name) return 'الاسم الكامل مطلوب';
  if (name.trim().length < 3) return 'الاسم يجب أن يكون 3 أحرف على الأقل';
  if (name.length > 100) return 'الاسم طويل جداً';
  if (!/^[\u0600-\u06FFa-zA-Z\s'-\.]+$/.test(name)) return 'الاسم يجب أن يحتوي على حروف فقط';
  return null;
};

/**
 * Validate Syrian phone number and return error message in Arabic
 */
export const getSyrianPhoneValidationMessage = (phone: string): string | null => {
  if (!phone) return 'رقم الهاتف مطلوب';
  const cleanPhone = phone.replace(/\s/g, '');
  
  // Syrian phone: starts with 09 or +963
  if (!/^(\+963|0)9\d{8}$/.test(cleanPhone)) {
    return 'رقم الهاتف غير صحيح (مثال: 0912345678 أو +963912345678)';
  }
  return null;
};

/**
 * Validate city and return error message in Arabic
 */
export const getCityValidationMessage = (city: string): string | null => {
  if (!city) return 'المحافظة مطلوبة';
  if (city.length < 2) return 'اسم المحافظة غير صحيح';
  return null;
};

/**
 * Validate street address and return error message in Arabic
 */
export const getStreetValidationMessage = (street: string): string | null => {
  if (!street) return 'العنوان التفصيلي مطلوب';
  if (street.trim().length < 5) return 'العنوان يجب أن يكون 5 أحرف على الأقل';
  if (street.length > 200) return 'العنوان طويل جداً';
  return null;
};

/**
 * Validate complete address and return all errors
 */
export const validateAddress = (address: {
  name: string;
  phone: string;
  city: string;
  street: string;
  region?: string;
}): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const nameError = getNameValidationMessage(address.name);
  if (nameError) errors.name = nameError;
  
  const phoneError = getSyrianPhoneValidationMessage(address.phone);
  if (phoneError) errors.phone = phoneError;
  
  const cityError = getCityValidationMessage(address.city);
  if (cityError) errors.city = cityError;
  
  const streetError = getStreetValidationMessage(address.street);
  if (streetError) errors.street = streetError;
  
  return errors;
};

/**
 * Check if address is valid (no errors)
 */
export const isAddressValid = (address: {
  name: string;
  phone: string;
  city: string;
  street: string;
  region?: string;
}): boolean => {
  const errors = validateAddress(address);
  return Object.keys(errors).length === 0;
};

/**
 * Format Syrian phone number for display
 */
export const formatSyrianPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\s/g, '');
  
  // If starts with +963
  if (cleanPhone.startsWith('+963')) {
    const number = cleanPhone.substring(4);
    return `+963 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
  }
  
  // If starts with 09
  if (cleanPhone.startsWith('09')) {
    return `${cleanPhone.substring(0, 4)} ${cleanPhone.substring(4, 7)} ${cleanPhone.substring(7)}`;
  }
  // If starts with just 9
  if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
    return `0${cleanPhone.substring(0, 3)} ${cleanPhone.substring(3, 6)} ${cleanPhone.substring(6)}`;
  }

  return phone;
};