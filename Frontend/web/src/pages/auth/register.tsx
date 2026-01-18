import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  defaultTextInputValidator,
  IValidator,
  loadProfanityListFromUrl,
  isValidEmail,
  isValidPhone,
  passwordsMatch,
  sanitizeInput
} from '@sbay/shared';
import { register } from '../../lib/api/auth';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function Register() {
    const { t, i18n } = useTranslation('common');
    const router = useRouter();
    const redirectParam = typeof router.query.redirect === 'string' ? router.query.redirect : '';
    const loginHref = redirectParam
      ? `/auth/login?redirect=${encodeURIComponent(redirectParam)}`
      : '/auth/login';

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone: '',
        city: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState<{
        username?: string,
        email?: string,
        phone?: string,
        city?: string,
        password?: string,
        confirmPassword?: string
    }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');

    const currentLocale = i18n?.language ?? 'ar';
    const tr = (key: string, fallbackEn: string, fallbackAr: string) => {
        const value = t(key);
        if (value === key) {
            return currentLocale === 'ar' ? fallbackAr : fallbackEn;
        }
        return value;
    };
    const setLocaleCookie = (locale: string) => {
        document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
    };

    const ensureLocaleLoaded = async (locale: string): Promise<boolean> => {
        if (!i18n) return;
        const canCheck = typeof i18n.getResourceBundle === 'function';
        if (canCheck) {
            try {
                const bundle = i18n.getResourceBundle(locale, 'common');
                if (bundle) return;
            } catch {
                // ignore and fall back to fetch
            }
        }
        if (typeof i18n.addResourceBundle !== 'function') return;
        const response = await fetch(`/locales/${locale}/common.json`);
        if (!response.ok) return false;
        const resources = await response.json();
        i18n.addResourceBundle(locale, 'common', resources, true, true);
        return true;
    };

    const handleLocaleChange = async (locale: string) => {
        if (typeof window === 'undefined') return;
        setLocaleCookie(locale);
        const loaded = await ensureLocaleLoaded(locale);
        i18n?.changeLanguage?.(locale);
        document.documentElement.lang = locale;
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
        if (!loaded) {
            window.location.reload();
        }
    };

    useEffect(() => {
        if (!i18n) return;
        const ensureLocaleLoaded = async () => {
            const canCheck = typeof i18n.getResourceBundle === 'function';
            if (canCheck) {
                try {
                    const bundle = i18n.getResourceBundle(i18n.language, 'common');
                    if (bundle) return;
                } catch {
                    // ignore and fall back to fetch
                }
            }
            if (typeof i18n.addResourceBundle !== 'function') return;
            const response = await fetch(`/locales/${i18n.language}/common.json`);
            if (!response.ok) return;
            const resources = await response.json();
            i18n.addResourceBundle(i18n.language, 'common', resources, true, true);
        };
        void ensureLocaleLoaded();
    }, [i18n, i18n?.language]);
    
    useEffect(() => {
        void loadProfanityListFromUrl('/profanities.txt');
    }, []);

    const fieldValidators: Partial<Record<keyof typeof formData, IValidator<string>>> = {
        username: defaultTextInputValidator,
        email: defaultTextInputValidator,
        phone: defaultTextInputValidator,
        city: defaultTextInputValidator
    };
    
    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};
        const username = sanitizeInput(formData.username);
        const email = sanitizeInput(formData.email);
        const unsafeMessage = tr(
            'auth.errors.inputUnsafe',
            'Input contains disallowed content',
            'Input contains disallowed content'
        );

        if (!username) {
            newErrors.username = tr('auth.errors.usernameRequired', 'Username is required', 'اسم المستخدم مطلوب');
        } else if (username.length < 3) {
            newErrors.username = tr('auth.errors.usernameMin', 'Username must be at least 3 characters', 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
        } else if (username.length > 20) {
            newErrors.username = tr('auth.errors.usernameMax', 'Username must be 20 characters or less', 'اسم المستخدم يجب ألا يتجاوز 20 حرفًا');
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            newErrors.username = tr('auth.errors.usernamePattern', 'Username can only contain letters, numbers, and underscores', 'اسم المستخدم يجب أن يحتوي على حروف وأرقام فقط');
        } else if (fieldValidators.username && !fieldValidators.username.validate(username).isValid) {
            newErrors.username = fieldValidators.username.validate(username).message ?? unsafeMessage;
        }

        if (!email) {
            newErrors.email = tr('auth.errors.emailRequired', 'Email is required', 'عنوان البريد الإلكتروني مطلوب');
        } else if (!isValidEmail(email)) {
            newErrors.email = tr('auth.errors.emailInvalid', 'Email is invalid', 'عنوان البريد الإلكتروني غير صالح');
        } else if (fieldValidators.email && !fieldValidators.email.validate(email).isValid) {
            newErrors.email = fieldValidators.email.validate(email).message ?? unsafeMessage;
        }

        if (formData.phone) {
            const phone = sanitizeInput(formData.phone);
            if (!isValidPhone(phone)) {
                newErrors.phone = tr('auth.errors.phoneInvalid', 'Phone number is invalid (e.g. 0912345678)', 'رقم الهاتف غير صالح (مثال: 0912345678)');
            } else if (fieldValidators.phone && !fieldValidators.phone.validate(phone).isValid) {
                newErrors.phone = fieldValidators.phone.validate(phone).message ?? unsafeMessage;
            }
        }

        if (!formData.password) {
            newErrors.password = tr('auth.errors.passwordRequired', 'Password is required', 'كلمة المرور مطلوبة');
        } else if (formData.password.length < 8) {
            newErrors.password = tr('auth.errors.passwordMin', 'Password must be at least 8 characters', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        } else if (!/[A-Z]/.test(formData.password)) {
            newErrors.password = tr('auth.errors.passwordUpper', 'Password must include an uppercase letter', 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل');
        } else if (!/[a-z]/.test(formData.password)) {
            newErrors.password = tr('auth.errors.passwordLower', 'Password must include a lowercase letter', 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل');
        } else if (!/[0-9]/.test(formData.password)) {
            newErrors.password = tr('auth.errors.passwordNumber', 'Password must include a number', 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = tr('auth.errors.confirmRequired', 'Confirm password is required', 'تأكيد كلمة المرور مطلوب');
        } else if (!passwordsMatch(formData.password, formData.confirmPassword)) {
            newErrors.confirmPassword = tr('auth.errors.confirmMismatch', 'Passwords do not match', 'كلمات المرور غير متطابقة');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        const validator = fieldValidators[name as keyof typeof formData];
        const validation = validator ? validator.validate(value) : { isValid: true };
        const unsafeMessage = tr(
            'auth.errors.inputUnsafe',
            'Input contains disallowed content',
            'Input contains disallowed content'
        );
        setErrors(prev => ({
            ...prev,
            [name]: validation.isValid ? undefined : validation.message ?? unsafeMessage
        }));

    }
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!validateForm()) return;
        setIsLoading(true);
        setApiError('');

        try {
            await register({
                name: formData.username,
                email: formData.email,
                phone: formData.phone,
                city: formData.city,
                password: formData.password
            });
            
            // Registration successful, redirect to login
            const redirectSuffix = redirectParam
              ? `&redirect=${encodeURIComponent(redirectParam)}`
              : '';
            router.push(`/auth/login?registered=true${redirectSuffix}`);
        } catch (error: any) {
            setApiError(error.response?.data?.message || tr('auth.errors.server', 'Server error', 'خطأ في الاتصال بالخادم'));
        } finally {
            setIsLoading(false);
        }
    }

    return (
      <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <div className="flex justify-end text-xs text-gray-500 mb-4">
            <button
              type="button"
              onClick={() => handleLocaleChange('en')}
              className={currentLocale === 'en' ? 'text-gray-900' : 'hover:text-gray-700'}
            >
              EN
            </button>
            <span className="px-2">|</span>
            <button
              type="button"
              onClick={() => handleLocaleChange('ar')}
              className={currentLocale === 'ar' ? 'text-gray-900' : 'hover:text-gray-700'}
            >
              AR
            </button>
          </div>
          <img
            alt="Sbayy Logo"
            src="/sbay_icon.svg"
            className="mx-auto h-10 w-auto"
          />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-black">
          {tr('auth.register.title', 'Create a new account', 'إنشاء حساب جديد')}
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {apiError && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm/6 font-medium text-black-100">
              {tr('auth.register.usernameLabel', 'Username *', 'اسم المستخدم *')}
            </label>
            <div className="mt-2">
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
                required
                autoComplete="username"
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
                  errors.username ? 'border-2 border-red-500' : ''
                }`}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-500">{errors.username}</p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm/6 font-medium text-black-100">
              {tr('auth.register.emailLabel', 'Email address *', 'عنوان البريد الإلكتروني *')}
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                required
                autoComplete="email"
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
                  errors.email ? 'border-2 border-red-500' : ''
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Phone Field */}
          <div>
            <label htmlFor="phone" className="block text-sm/6 font-medium text-black-100">
              {tr('auth.register.phoneLabel', 'Phone number', 'رقم الهاتف')}
            </label>
            <div className="mt-2">
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
                autoComplete="tel"
                placeholder={tr('auth.register.phonePlaceholder', 'e.g. 0912345678', 'مثال: 0912345678')}
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
                  errors.phone ? 'border-2 border-red-500' : ''
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* City Field */}
          <div>
            <label htmlFor="city" className="block text-sm/6 font-medium text-black-100">
              {tr('auth.register.cityLabel', 'City', 'المدينة')}
            </label>
            <div className="mt-2">
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={isLoading}
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
                  errors.city ? 'border-2 border-red-500' : ''
                }`}
              >
                <option value="">{tr('auth.register.cityPlaceholder', 'Select a city', 'اختر المدينة')}</option>
                <option value="دمشق">{tr('cities.damascus', 'Damascus', 'دمشق')}</option>
                <option value="ريف دمشق">{tr('cities.rifDamascus', 'Rif Dimashq', 'ريف دمشق')}</option>
                <option value="حلب">{tr('cities.aleppo', 'Aleppo', 'حلب')}</option>
                <option value="حمص">{tr('cities.homs', 'Homs', 'حمص')}</option>
                <option value="حماة">{tr('cities.hama', 'Hama', 'حماة')}</option>
                <option value="اللاذقية">{tr('cities.latakia', 'Latakia', 'اللاذقية')}</option>
                <option value="طرطوس">{tr('cities.tartus', 'Tartus', 'طرطوس')}</option>
                <option value="إدلب">{tr('cities.idlib', 'Idlib', 'إدلب')}</option>
                <option value="الرقة">{tr('cities.raqqa', 'Raqqa', 'الرقة')}</option>
                <option value="دير الزور">{tr('cities.deirEzZor', 'Deir ez-Zor', 'دير الزور')}</option>
                <option value="الحسكة">{tr('cities.alHasakah', 'Al-Hasakah', 'الحسكة')}</option>
                <option value="درعا">{tr('cities.daraa', 'Daraa', 'درعا')}</option>
                <option value="السويداء">{tr('cities.asSuwayda', 'As-Suwayda', 'السويداء')}</option>
                <option value="القنيطرة">{tr('cities.quneitra', 'Quneitra', 'القنيطرة')}</option>
              </select>
              {errors.city && (
                <p className="mt-1 text-sm text-red-500">{errors.city}</p>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm/6 font-medium text-black-100">
              {tr('auth.register.passwordLabel', 'Password *', 'كلمة المرور *')}
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                required
                autoComplete="new-password"
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
                  errors.password ? 'border-2 border-red-500' : ''
                }`}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm/6 font-medium text-black-100">
              {tr('auth.register.confirmLabel', 'Confirm password *', 'تأكيد كلمة المرور *')}
            </label>
            <div className="mt-2">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                required
                autoComplete="new-password"
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
                  errors.confirmPassword ? 'border-2 border-red-500' : ''
                }`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading
                ? tr('auth.register.submitting', 'Creating account...', 'جارٍ إنشاء الحساب...')
                : tr('auth.register.submit', 'Create account', 'إنشاء حساب')}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center text-sm">
          <a href={loginHref} className="font-semibold text-indigo-400 hover:text-indigo-300">
            {tr('auth.register.loginLink', 'Already have an account? Sign in', 'لديك حساب بالفعل؟ سجل الدخول')}
          </a>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}
