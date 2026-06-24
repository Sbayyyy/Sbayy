import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createOptionalTextInputValidator } from '@sbay/shared';
import { resetPassword } from '../../lib/api/auth';
import { getErrorMessage } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PasswordInput from '@/components/ui/password-input';

export default function ResetPassword() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [token, setToken] = useState<string | undefined>(undefined);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);

  const textInputValidator = useMemo(
    () =>
      createOptionalTextInputValidator({
        profanityMessage: t('validation.profanity'),
        sqlInjectionMessage: t('validation.sqlInjection'),
        xssMessage: t('validation.xss')
      }),
    [t]
  );

  useEffect(() => {
    if (!router.isReady || typeof window === 'undefined') return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search.replace(/^\?/, ''));
    setToken(hashParams.get('token') ?? searchParams.get('token') ?? '');
  }, [router.isReady]);

  const validatePasswordRules = (value: string): string | undefined => {
    if (!value) return t('auth.errors.passwordRequired');
    if (value.length < 8) return t('auth.errors.passwordMin');
    if (!/[A-Z]/.test(value)) return t('auth.errors.passwordUpper');
    if (!/[a-z]/.test(value)) return t('auth.errors.passwordLower');
    if (!/[0-9]/.test(value)) return t('auth.errors.passwordNumber');

    const validation = textInputValidator.validate(value);

    if (!validation.isValid) {
      return validation.message ?? t('auth.errors.inputUnsafe');
    }

    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    const passwordError = validatePasswordRules(password);

    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.passwordRequired');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('resetPassword.passwordMismatch');
    } else {
      const confirmPasswordValidation = textInputValidator.validate(confirmPassword);

      if (!confirmPasswordValidation.isValid) {
        newErrors.confirmPassword = confirmPasswordValidation.message ?? t('auth.errors.inputUnsafe');
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);

    const passwordError = validatePasswordRules(value);

    setErrors(prev => ({
      ...prev,
      password: passwordError
    }));

    if (apiError) setApiError('');
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);

    let confirmPasswordError: string | undefined;

    if (!value) {
      confirmPasswordError = t('auth.errors.passwordRequired');
    } else if (password && value !== password) {
      confirmPasswordError = t('resetPassword.passwordMismatch');
    } else {
      const validation = textInputValidator.validate(value);
      confirmPasswordError = validation.isValid
        ? undefined
        : validation.message ?? t('auth.errors.inputUnsafe');
    }

    setErrors(prev => ({
      ...prev,
      confirmPassword: confirmPasswordError
    }));

    if (apiError) setApiError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setApiError(t('resetPassword.invalidToken'));
      return;
    }

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

  if (router.isReady && token === undefined) {
    return (
      <div className="auth-page">
        <div className="auth-card text-center">
          <img alt={t('header.logoAlt')} src={config.logoUrl} className="auth-logo" />
          <p className="mt-8 text-sm text-slate-600">
            {t('resetPassword.loading', 'Loading reset link...')}
          </p>
        </div>
      </div>
    );
  }

  if (router.isReady && token !== undefined && !token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <img alt={t('header.logoAlt')} src={config.logoUrl} className="auth-logo" />
          <h2 className="auth-title">
            {t('resetPassword.invalidToken')}
          </h2>
          <p className="auth-subtitle">
            {t('resetPassword.invalidTokenDescription')}
          </p>
          <div className="mt-6 text-center">
            <Link
              href="/auth/forgetPassword"
              className="auth-link"
            >
              {t('resetPassword.requestNewLink')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <img alt={t('header.logoAlt')} src={config.logoUrl} className="auth-logo" />
          <h2 className="auth-title">
            {t('resetPassword.success')}
          </h2>
          <p className="auth-subtitle">
            {t('resetPassword.successDescription')}
          </p>
          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="btn btn-primary w-full"
            >
              {t('resetPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img alt={t('header.logoAlt')} src={config.logoUrl} className="auth-logo" />
        <h2 className="auth-title">
          {t('resetPassword.title')}
        </h2>
        <p className="auth-subtitle">
          {t('resetPassword.description')}
        </p>

      <div className="mt-8">
        {apiError && (
          <div className="auth-alert-error">
            <span className="block sm:inline">{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="password" className="auth-label">
              {t('resetPassword.passwordLabel')}
            </label>
            <div className="mt-2">
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                disabled={isLoading}
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
              {t('resetPassword.confirmLabel')}
            </label>
            <div className="mt-2">
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                disabled={isLoading}
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
              disabled={isLoading}
              className={`btn btn-primary w-full ${
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
            className="auth-link"
          >
            {t('resetPassword.backToLogin')}
          </Link>
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
