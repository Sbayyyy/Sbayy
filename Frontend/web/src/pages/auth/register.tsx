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
import { getErrorMessage } from '@/lib/api/errors';
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
    const setLocaleCookie = (locale: string) => {
        document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
    };

    const ensureLocaleLoaded = async (locale: string): Promise<boolean> => {
        if (!i18n) return false;
        const canCheck = typeof i18n.getResourceBundle === 'function';
        if (canCheck) {
            try {
                const bundle = i18n.getResourceBundle(locale, 'common');
                if (bundle) return true;
            } catch {
                // ignore and fall back to fetch
            }
        }
        if (typeof i18n.addResourceBundle !== 'function') return false;
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
        const unsafeMessage = t('auth.errors.inputUnsafe');

        if (!username) {
            newErrors.username = t('auth.errors.usernameRequired');
        } else if (username.length < 3) {
            newErrors.username = t('auth.errors.usernameMin');
        } else if (username.length > 20) {
            newErrors.username = t('auth.errors.usernameMax');
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            newErrors.username = t('auth.errors.usernamePattern');
        } else if (fieldValidators.username && !fieldValidators.username.validate(username).isValid) {
            newErrors.username = fieldValidators.username.validate(username).message ?? unsafeMessage;
        }

        if (!email) {
            newErrors.email = t('auth.errors.emailRequired');
        } else if (!isValidEmail(email)) {
            newErrors.email = t('auth.errors.emailInvalid');
        } else if (fieldValidators.email && !fieldValidators.email.validate(email).isValid) {
            newErrors.email = fieldValidators.email.validate(email).message ?? unsafeMessage;
        }

        if (formData.phone) {
            const phone = sanitizeInput(formData.phone);
            if (!isValidPhone(phone)) {
                newErrors.phone = t('auth.errors.phoneInvalid');
            } else if (fieldValidators.phone && !fieldValidators.phone.validate(phone).isValid) {
                newErrors.phone = fieldValidators.phone.validate(phone).message ?? unsafeMessage;
            }
        }

        if (!formData.password) {
            newErrors.password = t('auth.errors.passwordRequired');
        } else if (formData.password.length < 8) {
            newErrors.password = t('auth.errors.passwordMin');
        } else if (!/[A-Z]/.test(formData.password)) {
            newErrors.password = t('auth.errors.passwordUpper');
        } else if (!/[a-z]/.test(formData.password)) {
            newErrors.password = t('auth.errors.passwordLower');
        } else if (!/[0-9]/.test(formData.password)) {
            newErrors.password = t('auth.errors.passwordNumber');
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = t('auth.errors.confirmRequired');
        } else if (!passwordsMatch(formData.password, formData.confirmPassword)) {
            newErrors.confirmPassword = t('auth.errors.confirmMismatch');
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
        const unsafeMessage = t('auth.errors.inputUnsafe');
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
        } catch (error: unknown) {
            setApiError(getErrorMessage(error));
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
          {t('auth.register.title')}
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
              {t('auth.register.usernameLabel')}
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
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-500 sm:text-sm/6 ${
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
              {t('auth.register.emailLabel')}
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
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-500 sm:text-sm/6 ${
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
              {t('auth.register.phoneLabel')}
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
                placeholder={t('auth.register.phonePlaceholder')}
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-500 sm:text-sm/6 ${
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
              {t('auth.register.cityLabel')}
            </label>
            <div className="mt-2">
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={isLoading}
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-500 sm:text-sm/6 ${
                  errors.city ? 'border-2 border-red-500' : ''
                }`}
              >
                <option value="">{t('auth.register.cityPlaceholder')}</option>
                <option value="دمشق">{t('cities.damascus')}</option>
                <option value="ريف دمشق">{t('cities.rifDamascus')}</option>
                <option value="حلب">{t('cities.aleppo')}</option>
                <option value="حمص">{t('cities.homs')}</option>
                <option value="حماة">{t('cities.hama')}</option>
                <option value="اللاذقية">{t('cities.latakia')}</option>
                <option value="طرطوس">{t('cities.tartus')}</option>
                <option value="إدلب">{t('cities.idlib')}</option>
                <option value="الرقة">{t('cities.raqqa')}</option>
                <option value="دير الزور">{t('cities.deirEzZor')}</option>
                <option value="الحسكة">{t('cities.alHasakah')}</option>
                <option value="درعا">{t('cities.daraa')}</option>
                <option value="السويداء">{t('cities.asSuwayda')}</option>
                <option value="القنيطرة">{t('cities.quneitra')}</option>
              </select>
              {errors.city && (
                <p className="mt-1 text-sm text-red-500">{errors.city}</p>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm/6 font-medium text-black-100">
              {t('auth.register.passwordLabel')}
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
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-500 sm:text-sm/6 ${
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
              {t('auth.register.confirmLabel')}
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
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-500 sm:text-sm/6 ${
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
              className={`flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading
                ? t('auth.register.submitting')
                : t('auth.register.submit')}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center text-sm">
          <a href={loginHref} className="font-semibold text-primary-500 hover:text-primary-400">
            {t('auth.register.loginLink')}
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
