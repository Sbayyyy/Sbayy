import { useCallback, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  createOptionalTextInputValidator,
  IValidator,
  isValidEmail,
  isValidPhone,
  passwordsMatch,
  sanitizeInput
} from '@sbay/shared';
import { loginWithGoogle, register } from '../../lib/api/auth';
import { getErrorMessage } from '@/lib/api/errors';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Select } from '@/components/ui/select';
import { config } from '@/lib/config';
import { CITIES, normalizeCityValue } from '@/lib/constants';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import PasswordInput from '@/components/ui/password-input';
import { useAuthStore } from '@/lib/store';

export default function Register() {
    const { t, i18n } = useTranslation('common');
    const router = useRouter();
    const { login: loginStore } = useAuthStore();
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
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [apiError, setApiError] = useState('');

    const currentLocale = i18n?.language ?? 'ar';

    const textInputValidator = useMemo(
        () =>
            createOptionalTextInputValidator({
                profanityMessage: t('validation.profanity'),
                sqlInjectionMessage: t('validation.sqlInjection'),
                xssMessage: t('validation.xss')
            }),
        [t]
    );

    const fieldValidators: Partial<Record<keyof typeof formData, IValidator<string>>> = {
        username: textInputValidator,
        email: textInputValidator,
        phone: textInputValidator,
        city: textInputValidator
    };

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
            } catch {}
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
        if (router.locales?.includes(locale)) {
            void router.replace(router.asPath, undefined, { locale, scroll: false });
        }
        if (!loaded) {
            window.location.reload();
        }
    };

    useEffect(() => {
        if (!i18n) return;

        const ensureCurrentLocaleLoaded = async () => {
            const canCheck = typeof i18n.getResourceBundle === 'function';
            if (canCheck) {
                try {
                    const bundle = i18n.getResourceBundle(i18n.language, 'common');
                    if (bundle) return;
                } catch {}
            }

            if (typeof i18n.addResourceBundle !== 'function') return;

            const response = await fetch(`/locales/${i18n.language}/common.json`);
            if (!response.ok) return;

            const resources = await response.json();
            i18n.addResourceBundle(i18n.language, 'common', resources, true, true);
        };

        void ensureCurrentLocaleLoaded();
    }, [i18n, i18n?.language]);

    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};
        const username = sanitizeInput(formData.username);
        const email = sanitizeInput(formData.email);
        const phone = sanitizeInput(formData.phone);
        const city = sanitizeInput(formData.city);
        const unsafeMessage = t('auth.errors.inputUnsafe');

        if (!username) {
            newErrors.username = t('auth.errors.usernameRequired');
        } else if (username.length < 3) {
            newErrors.username = t('auth.errors.usernameMin');
        } else if (username.length > 20) {
            newErrors.username = t('auth.errors.usernameMax');
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            newErrors.username = t('auth.errors.usernamePattern');
        } else if (fieldValidators.username) {
            const validation = fieldValidators.username.validate(username);
            if (!validation.isValid) {
                newErrors.username = validation.message ?? unsafeMessage;
            }
        }

        if (!email) {
            newErrors.email = t('auth.errors.emailRequired');
        } else if (!isValidEmail(email)) {
            newErrors.email = t('auth.errors.emailInvalid');
        } else if (fieldValidators.email) {
            const validation = fieldValidators.email.validate(email);
            if (!validation.isValid) {
                newErrors.email = validation.message ?? unsafeMessage;
            }
        }

        if (phone) {
            if (!isValidPhone(phone)) {
                newErrors.phone = t('auth.errors.phoneInvalid');
            } else if (fieldValidators.phone) {
                const validation = fieldValidators.phone.validate(phone);
                if (!validation.isValid) {
                    newErrors.phone = validation.message ?? unsafeMessage;
                }
            }
        }

        if (city && fieldValidators.city) {
            const validation = fieldValidators.city.validate(city);
            if (!validation.isValid) {
                newErrors.city = validation.message ?? unsafeMessage;
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
        const sanitizedValue = sanitizeInput(value);

        setFormData(prev => ({
            ...prev,
            [name]: sanitizedValue
        }));

        const validator = fieldValidators[name as keyof typeof formData];
        const validation = validator ? validator.validate(sanitizedValue) : { isValid: true };
        const unsafeMessage = t('auth.errors.inputUnsafe');

        setErrors(prev => ({
            ...prev,
            [name]: validation.isValid ? undefined : validation.message ?? unsafeMessage
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setApiError('');

        try {
            await register({
                name: formData.username,
                email: formData.email,
                phone: formData.phone,
                city: normalizeCityValue(formData.city),
                password: formData.password
            });

            const redirectSuffix = redirectParam
              ? `&redirect=${encodeURIComponent(redirectParam)}`
              : '';

            router.push(`/auth/login?registered=true${redirectSuffix}`);
        } catch (error: unknown) {
            setApiError(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    const normalizeRedirect = useCallback((value: string) => {
        if (!value || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//')) {
            return '/';
        }

        if (value.includes('[')) {
            return '/';
        }

        if (!value.startsWith('/')) return `/${value}`;

        const locales = router.locales || [];
        const hasLocalePrefix = locales.some(locale => value === `/${locale}` || value.startsWith(`/${locale}/`));

        if (hasLocalePrefix || !router.locale) return value;

        return `/${router.locale}${value}`;
    }, [router.locale, router.locales]);

    const handleGoogleToken = useCallback(async (idToken: string) => {
        setIsGoogleLoading(true);
        setApiError('');

        try {
            const data = await loginWithGoogle(idToken);
            loginStore(data.user, data.token, data.refreshToken);
            const storedRedirect = typeof window !== 'undefined'
              ? window.sessionStorage.getItem('authRedirect') || ''
              : '';
            const redirect = normalizeRedirect(redirectParam || storedRedirect || '/');

            if (typeof window !== 'undefined') {
              window.sessionStorage.removeItem('authRedirect');
            }

            void router.push(redirect);
        } catch (error: unknown) {
            setApiError(getErrorMessage(error));
        } finally {
            setIsGoogleLoading(false);
        }
    }, [loginStore, normalizeRedirect, redirectParam, router]);

    return (
      <div className="auth-page">
        <div className="auth-card max-w-lg">
          <div className="mb-4 flex justify-end text-xs text-slate-500">
            <button
              type="button"
              onClick={() => handleLocaleChange('en')}
              className={currentLocale === 'en' ? 'font-bold text-slate-950' : 'hover:text-slate-700'}
            >
              EN
            </button>
            <span className="px-2">|</span>
            <button
              type="button"
              onClick={() => handleLocaleChange('ar')}
              className={currentLocale === 'ar' ? 'font-bold text-slate-950' : 'hover:text-slate-700'}
            >
              AR
            </button>
          </div>

          <img
            alt={t('header.logoAlt')}
            src={config.logoUrl}
            className="auth-logo"
          />

          <h2 className="auth-title">
            {t('auth.register.title')}
          </h2>

        <div className="mt-8">
          {apiError && (
            <div className="auth-alert-error">
              <span className="block sm:inline">{apiError}</span>
            </div>
          )}

          <div className="mb-6 space-y-4">
            <GoogleAuthButton
              onToken={handleGoogleToken}
              onError={setApiError}
              disabled={isLoading || isGoogleLoading}
            />
            <div className="flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span>{t('auth.google.orEmail')}</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="username" className="auth-label">
                {t('auth.register.usernameLabel')}
              </label>
              <div className="mt-2">
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  required
                  autoComplete="username"
                  className={`input ${
                    errors.username ? '!border-red-400 focus:!border-red-400 focus:!ring-red-100' : ''
                  }`}
                />
                {errors.username && (
                  <p className="mt-1 text-sm font-medium text-red-600">{errors.username}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="auth-label">
                {t('auth.register.emailLabel')}
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  required
                  autoComplete="email"
                  className={`input ${
                    errors.email ? '!border-red-400 focus:!border-red-400 focus:!ring-red-100' : ''
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm font-medium text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="auth-label">
                {t('auth.register.phoneLabel')}
              </label>
              <div className="mt-2">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  autoComplete="tel"
                  placeholder={t('auth.register.phonePlaceholder')}
                  className={`input ${
                    errors.phone ? '!border-red-400 focus:!border-red-400 focus:!ring-red-100' : ''
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm font-medium text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="city" className="auth-label">
                {t('auth.register.cityLabel')}
              </label>
              <div className="mt-2">
                <Select
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  className={`text-base sm:text-sm/6 ${
                    errors.city ? '!border-red-500 focus:!border-red-500 focus:!ring-red-100' : ''
                  }`}
                >
                  <option value="">{t('auth.register.cityPlaceholder')}</option>
                  {CITIES.map(city => (
                    <option key={city.value} value={city.value}>{t(city.i18nKey, city.i18nDefault)}</option>
                  ))}
                </Select>
                {errors.city && (
                  <p className="mt-1 text-sm font-medium text-red-600">{errors.city}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="auth-label">
                {t('auth.register.passwordLabel')}
              </label>
              <div className="mt-2">
                <PasswordInput
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  required
                  autoComplete="new-password"
                  className={`${
                    errors.password ? '!border-red-400 focus:!border-red-400 focus:!ring-red-100' : ''
                  }`}
                />
                {errors.password && (
                  <p className="mt-1 text-sm font-medium text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="auth-label">
                {t('auth.register.confirmLabel')}
              </label>
              <div className="mt-2">
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  required
                  autoComplete="new-password"
                  className={`${
                    errors.confirmPassword ? '!border-red-400 focus:!border-red-400 focus:!ring-red-100' : ''
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm font-medium text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className={`btn btn-primary w-full ${
                  (isLoading || isGoogleLoading) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading
                  ? t('auth.register.submitting')
                  : t('auth.register.submit')}
              </button>
            </div>
          </form>

          <div className="mt-4 text-center text-sm">
            <a href={loginHref} className="auth-link">
              {t('auth.register.loginLink')}
            </a>
          </div>
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
