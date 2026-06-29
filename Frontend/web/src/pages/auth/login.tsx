import { useCallback, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  createOptionalTextInputValidator,
  IValidator,
  isValidEmail,
  sanitizeInput
} from '@sbay/shared';
import { login, loginWithGoogle } from '../../lib/api/auth';
import { getErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { config, features } from '@/lib/config';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import PasswordInput from '@/components/ui/password-input';

export default function Login() {
    const { t, i18n } = useTranslation('common');
    const { login: loginStore } = useAuthStore();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [apiError, setApiError] = useState('');

    const redirectParam = typeof router.query.redirect === 'string' ? router.query.redirect : '';
    const showRegisteredNotice = router.query.registered === 'true';
    const showVerifiedNotice = router.query.verified === 'true';
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

    const completeLogin = useCallback((data: Awaited<ReturnType<typeof login>>) => {
        loginStore(data.user, data.token, data.refreshToken);

        const queryRedirect = typeof router.query.redirect === 'string' ? router.query.redirect : '';
        const storedRedirect = typeof window !== 'undefined'
          ? window.sessionStorage.getItem('authRedirect') || ''
          : '';
        const rawRedirect = queryRedirect || storedRedirect || '/';
        const redirect = normalizeRedirect(rawRedirect);

        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('authRedirect');
        }

        void router.push(redirect);
    }, [loginStore, normalizeRedirect, router]);

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

            completeLogin(data);
        } catch (error: unknown) {
            setApiError(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleToken = useCallback(async (idToken: string) => {
        setIsGoogleLoading(true);
        setApiError('');

        try {
            const data = await loginWithGoogle(idToken);
            completeLogin(data);
        } catch (error: unknown) {
            setApiError(getErrorMessage(error));
        } finally {
            setIsGoogleLoading(false);
        }
    }, [completeLogin]);

    return (
      <>
        <div className="auth-page">
          <div className="auth-card">
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
              {t('auth.login.title')}
            </h2>

          <div className="mt-8">
              {showRegisteredNotice && (
              <div className="auth-alert-success">
                  {t('verifyEmail.checkBeforeSignIn')}
              </div>
              )}
              {showVerifiedNotice && (
              <div className="auth-alert-success">
                  {t('verifyEmail.successAfterVerify')}
              </div>
              )}
              {apiError && (
              <div className="auth-alert-error">
                  <span className="block sm:inline">{apiError}</span>
              </div>
              )}

            <div className="space-y-4">
              <GoogleAuthButton
                onToken={handleGoogleToken}
                onError={setApiError}
                disabled={isLoading || isGoogleLoading}
                comingSoon={features.googleAuthComingSoon}
              />
              <div className="flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                <span>{t('auth.google.orEmail')}</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
              <div>
                <label htmlFor="email" className="auth-label">
                  {t('auth.login.emailLabel')}
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
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
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="auth-label">
                    {t('auth.login.passwordLabel')}
                  </label>
                  <div className="text-sm">
                    <Link href="/auth/forgetPassword" className="auth-link">
                      {t('auth.login.forgot')}
                    </Link>
                  </div>
                </div>

                <div className="mt-2">
                  <PasswordInput
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                    required
                    autoComplete="current-password"
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
                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className={`btn btn-primary w-full ${
                      (isLoading || isGoogleLoading) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading
                    ? t('auth.login.submitting')
                    : t('auth.login.submit')}
                </button>
              </div>
            </form>

              <div className="mt-4 text-center text-sm">
                  <Link href={registerHref} className="auth-link">
                      {t('auth.login.registerLink')}
                    </Link>
              </div>
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
