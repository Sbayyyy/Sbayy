import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { defaultTextInputValidator, IValidator, loadProfanityListFromUrl, isValidEmail } from '@sbay/shared';
import { login } from '../../lib/api/auth';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function Login() {
    const { t, i18n } = useTranslation('common');
    const { login: loginStore } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const fieldValidators: Partial<Record<'email' | 'password', IValidator<string>>> = {
        email: defaultTextInputValidator,
        password: defaultTextInputValidator
    };

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

    const router = useRouter();
    const redirectParam = typeof router.query.redirect === 'string' ? router.query.redirect : '';
    const registerHref = redirectParam
      ? `/auth/register?redirect=${encodeURIComponent(redirectParam)}`
      : '/auth/register';
  
    const validateForm = (): boolean => {
        const newErrors = { email: '', password: '' };
        const unsafeMessage = tr(
            'auth.errors.inputUnsafe',
            'Input contains disallowed content',
            'Input contains disallowed content'
        );
        if(!email){
            newErrors.email = tr('auth.errors.emailRequired', 'Email is required', 'عنوان البريد الإلكتروني مطلوب');
        } else if (!isValidEmail(email)) {
            newErrors.email = tr('auth.errors.emailInvalid', 'Email is invalid', 'عنوان البريد الإلكتروني غير صالح');
        } else if (fieldValidators.email && !fieldValidators.email.validate(email).isValid) {
            newErrors.email = fieldValidators.email.validate(email).message ?? unsafeMessage;
        }
        if(!password || password.length < 6){
            newErrors.password = tr('auth.errors.passwordMinLogin', 'Password must be at least 6 characters', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        } else if (fieldValidators.password && !fieldValidators.password.validate(password).isValid) {
            newErrors.password = fieldValidators.password.validate(password).message ?? unsafeMessage;
        }
        setErrors(newErrors);
        return !newErrors.email && !newErrors.password;
            
    };

    const handleFieldChange = (name: 'email' | 'password', value: string) => {
        const validator = fieldValidators[name];
        const unsafeMessage = tr(
            'auth.errors.inputUnsafe',
            'Input contains disallowed content',
            'Input contains disallowed content'
        );
        const result = validator ? validator.validate(value) : { isValid: true };
        setErrors(prev => ({
            ...prev,
            [name]: result.isValid ? undefined : result.message ?? unsafeMessage
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsLoading(true);
        setApiError('');
        
        try {
            const data = await login({ email, password });
            
            // Store in AuthStore (which also saves to localStorage)
            loginStore(data.user, data.token);
            
            // Redirect
            const queryRedirect = typeof router.query.redirect === 'string' ? router.query.redirect : '';
            const storedRedirect = typeof window !== 'undefined'
              ? window.sessionStorage.getItem('authRedirect') || ''
              : '';
            const rawRedirect = queryRedirect || storedRedirect || '/';
            const normalizeRedirect = (value: string) => {
              if (!value || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//')) {
                return '/';
              }
              if (!value.startsWith('/')) return `/${value}`;
              const locales = router.locales || [];
              const hasLocalePrefix = locales.some(locale => value === `/${locale}` || value.startsWith(`/${locale}/`));
              if (hasLocalePrefix || !router.locale) return value;
              return `/${router.locale}${value}`;
            };
            const redirect = normalizeRedirect(rawRedirect);
            if (typeof window !== 'undefined') {
              window.sessionStorage.removeItem('authRedirect');
            }
            router.push(redirect);
        } catch (error: any) {
            setApiError(error.response?.data?.message || tr('auth.errors.server', 'Server error', 'خطأ في الاتصال بالخادم'));
        } finally {
            setIsLoading(false);
        }
    };


    return (
    <>
      {/*
        This example requires updating your template:

        ```
        <html class="h-full bg-gray-900">
        <body class="h-full">
        ```
      */}
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
            {tr('auth.login.title', 'Sign in to your account', 'تسجيل الدخول إلى حسابك')}
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            {apiError && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{apiError}</span>
            </div>
            )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm/6 font-medium text-black-100">
                {tr('auth.login.emailLabel', 'Email address', 'عنوان البريد الإلكتروني')}
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    handleFieldChange('email', e.target.value);
                  }}
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

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm/6 font-medium text-black-100">
                  {tr('auth.login.passwordLabel', 'Password', 'كلمة المرور')}
                </label>
                <div className="text-sm">
                  <a href="forgetPassword" className="font-semibold text-indigo-400 hover:text-indigo-300">
                    {tr('auth.login.forgot', 'Forgot your password?', 'نسيت كلمة المرور؟')}
                  </a>
                </div>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleFieldChange('password', e.target.value);
                  }}
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                  className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
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
                className={`flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading
                  ? tr('auth.login.submitting', 'Signing in...', 'جارٍ تسجيل الدخول...')
                  : tr('auth.login.submit', 'Sign in', 'تسجيل الدخول')}
              </button>
            </div>
          </form>

            <div className="mt-4 text-center text-sm">
                <a href={registerHref} className="font-semibold text-indigo-400 hover:text-indigo-300">
                    {tr('auth.login.registerLink', "Don't have an account? Register", 'ليس لديك حساب؟ سجل الآن')}
                  </a>
            </div>
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'ar', ['common']))
    }
  };
}
