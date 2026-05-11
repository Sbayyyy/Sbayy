import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  createOptionalTextInputValidator,
  IValidator,
  loadProfanityListFromUrl,
  isValidEmail,
  sanitizeInput
} from '@sbay/shared';
import { login } from '../../lib/api/auth';
import { getErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function Login() {
    const { t, i18n } = useTranslation('common');
    const { login: loginStore } = useAuthStore();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');

    const redirectParam = typeof router.query.redirect === 'string' ? router.query.redirect : '';
    const registerHref = redirectParam
      ? `/auth/register?redirect=${encodeURIComponent(redirectParam)}`
      : '/auth/register';

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

    const fieldValidators: Partial<Record<'email' | 'password', IValidator<string>>> = {
        email: textInputValidator,
        password: textInputValidator
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

    useEffect(() => {
        void loadProfanityListFromUrl('/profanities.txt');
    }, []);

    const validateForm = (): boolean => {
        const newErrors: { email?: string; password?: string } = {};
        const sanitizedEmail = sanitizeInput(email);
        const unsafeMessage = t('auth.errors.inputUnsafe');

        if (!sanitizedEmail) {
            newErrors.email = t('auth.errors.emailRequired');
        } else if (!isValidEmail(sanitizedEmail)) {
            newErrors.email = t('auth.errors.emailInvalid');
        } else if (fieldValidators.email) {
            const validation = fieldValidators.email.validate(sanitizedEmail);

            if (!validation.isValid) {
                newErrors.email = validation.message ?? unsafeMessage;
            }
        }

        if (!password || password.length < 6) {
            newErrors.password = t('auth.errors.passwordMinLogin');
        } else if (fieldValidators.password) {
            const validation = fieldValidators.password.validate(password);

            if (!validation.isValid) {
                newErrors.password = validation.message ?? unsafeMessage;
            }
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const handleFieldChange = (name: 'email' | 'password', value: string) => {
        const sanitizedValue = name === 'email' ? sanitizeInput(value) : value;

        if (name === 'email') {
            setEmail(sanitizedValue);
        } else {
            setPassword(sanitizedValue);
        }

        const validator = fieldValidators[name];
        const unsafeMessage = t('auth.errors.inputUnsafe');
        const result = validator ? validator.validate(sanitizedValue) : { isValid: true };

        setErrors(prev => ({
            ...prev,
            [name]: result.isValid ? undefined : result.message ?? unsafeMessage
        }));
    };

    const normalizeRedirect = (value: string) => {
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
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setApiError('');

        try {
            const data = await login({
                email: sanitizeInput(email),
                password
            });

            loginStore(data.user, data.token);

            const queryRedirect = typeof router.query.redirect === 'string' ? router.query.redirect : '';
            const storedRedirect = typeof window !== 'undefined'
              ? window.sessionStorage.getItem('authRedirect') || ''
              : '';
            const rawRedirect = queryRedirect || storedRedirect || '/';
            const redirect = normalizeRedirect(rawRedirect);

            if (typeof window !== 'undefined') {
              window.sessionStorage.removeItem('authRedirect');
            }

            router.push(redirect);
        } catch (error: unknown) {
            setApiError(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    return (
      <>
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
              {t('auth.login.title')}
            </h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
              {apiError && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                  <span className="block sm:inline">{apiError}</span>
              </div>
              )}

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm/6 font-medium text-black-100">
                  {t('auth.login.emailLabel')}
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
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

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm/6 font-medium text-black-100">
                    {t('auth.login.passwordLabel')}
                  </label>
                  <div className="text-sm">
                    <a href="/auth/forgetPassword" className="font-semibold text-primary-500 hover:text-primary-400">
                      {t('auth.login.forgot')}
                    </a>
                  </div>
                </div>

                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    disabled={isLoading}
                    required
                    autoComplete="current-password"
                    className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-500 sm:text-sm/6 ${
                      errors.password ? 'border-2 border-red-500' : ''
                  }`}
                  />
                  {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading
                    ? t('auth.login.submitting')
                    : t('auth.login.submit')}
                </button>
              </div>
            </form>

              <div className="mt-4 text-center text-sm">
                  <a href={registerHref} className="font-semibold text-primary-500 hover:text-primary-400">
                      {t('auth.login.registerLink')}
                    </a>
              </div>
          </div>
        </div>
      </>
    );
}

export async function getServerSideProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}