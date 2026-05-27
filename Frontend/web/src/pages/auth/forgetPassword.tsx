import { useState, useMemo } from 'react';
import {
  createOptionalTextInputValidator,
  isValidEmail,
  sanitizeInput
} from '@sbay/shared';
import { forgotPassword } from '../../lib/api/auth';
import { getErrorMessage } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function ForgotPassword() {
  const { t } = useTranslation('common');

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
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

  const validateForm = (): boolean => {
    const sanitizedEmail = sanitizeInput(email);

    if (!sanitizedEmail) {
      setError(t('auth.errors.emailRequired'));
      return false;
    }

    if (!isValidEmail(sanitizedEmail)) {
      setError(t('auth.errors.emailInvalid'));
      return false;
    }

    const validation = textInputValidator.validate(sanitizedEmail);

    if (!validation.isValid) {
      setError(validation.message ?? t('auth.errors.inputUnsafe'));
      return false;
    }

    setError('');
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = sanitizeInput(e.target.value);

    setEmail(sanitizedValue);

    if (error) setError('');
    if (apiError) setApiError('');
    if (success) setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const sanitizedEmail = sanitizeInput(email);

    setIsLoading(true);
    setApiError('');
    setSuccess(false);

    try {
      await forgotPassword(sanitizedEmail);

      setSuccess(true);
      setEmail('');
    } catch (error: unknown) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img
          alt={t('header.logoAlt')}
          src={config.logoUrl}
          className="auth-logo"
        />
        <h2 className="auth-title">
          {t('forgotPassword.title')}
        </h2>
        <p className="auth-subtitle">
          {t('forgotPassword.description')}
        </p>

      <div className="mt-8">
        {success && (
          <div className="auth-alert-success">
            <span className="block sm:inline">
              {t('forgotPassword.successMessage')}
            </span>
          </div>
        )}

        {apiError && (
          <div className="auth-alert-error">
            <span className="block sm:inline">{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="email" className="auth-label">
              {t('forgotPassword.emailLabel')}
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={handleChange}
                disabled={isLoading || success}
                required
                autoComplete="email"
                placeholder="example@email.com"
                className={`input ${
                  error ? '!border-red-400 focus:!border-red-400 focus:!ring-red-100' : ''
                }`}
              />
              {error && (
                <p className="mt-1 text-sm font-medium text-red-600">{error}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || success}
              className={`btn btn-primary w-full ${
                (isLoading || success) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading
                ? t('forgotPassword.submitting')
                : success
                  ? t('forgotPassword.submitted')
                  : t('forgotPassword.submit')}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/auth/login"
            className="auth-link"
          >
            {t('forgotPassword.backToLogin')}
          </a>
        </div>

        {success && (
          <div className="mt-4 text-center text-xs text-slate-500">
            {t('forgotPassword.spamNote')}
          </div>
        )}
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
