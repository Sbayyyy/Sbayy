import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { resetPassword } from '../../lib/api/auth';
import { getErrorMessage } from '@/lib/api/errors';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function ResetPassword() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!password) {
      newErrors.password = t('auth.errors.passwordRequired');
    } else if (password.length < 8) {
      newErrors.password = t('auth.errors.passwordMin');
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = t('auth.errors.passwordUpper');
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = t('auth.errors.passwordLower');
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = t('auth.errors.passwordNumber');
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.passwordRequired');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('resetPassword.passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError('');

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (error: unknown) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // No token provided
  if (!token && router.isReady) {
    return (
      <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <img alt="Sbayy Logo" src="/sbay_icon.svg" className="mx-auto h-10 w-auto" />
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-black">
            {t('resetPassword.invalidToken')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('resetPassword.invalidTokenDescription')}
          </p>
          <div className="mt-6 text-center">
            <Link
              href="/auth/forgetPassword"
              className="text-sm font-semibold text-primary-500 hover:text-primary-400"
            >
              {t('resetPassword.requestNewLink')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <img alt="Sbayy Logo" src="/sbay_icon.svg" className="mx-auto h-10 w-auto" />
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-black">
            {t('resetPassword.success')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('resetPassword.successDescription')}
          </p>
          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              {t('resetPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img alt="Sbayy Logo" src="/sbay_icon.svg" className="mx-auto h-10 w-auto" />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-black">
          {t('resetPassword.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('resetPassword.description')}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {apiError && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm/6 font-medium text-black-100">
              {t('resetPassword.passwordLabel')}
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                  if (apiError) setApiError('');
                }}
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm/6 font-medium text-black-100">
              {t('resetPassword.confirmLabel')}
            </label>
            <div className="mt-2">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                  if (apiError) setApiError('');
                }}
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

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? t('resetPassword.submitting') : t('resetPassword.submit')}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="text-sm font-semibold text-primary-500 hover:text-primary-400"
          >
            {t('resetPassword.backToLogin')}
          </Link>
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
