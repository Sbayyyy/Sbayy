import { useState, useMemo } from 'react';
import {
  createOptionalTextInputValidator,
  isValidEmail,
  sanitizeInput
} from '@sbay/shared';
import { forgotPassword } from '../../lib/api/auth';
import { getErrorMessage } from '@/lib/api/errors';
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
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Sbayy Logo"
          src="/sbay_icon.svg"
          className="mx-auto h-10 w-auto"
        />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-black">
          {t('forgotPassword.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('forgotPassword.description')}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">
              {t('forgotPassword.successMessage')}
            </span>
          </div>
        )}

        {apiError && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm/6 font-medium text-black-100">
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
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-500 sm:text-sm/6 ${
                  error ? 'border-2 border-red-500' : ''
                }`}
              />
              {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || success}
              className={`flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
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
            className="text-sm font-semibold text-primary-500 hover:text-primary-400"
          >
            {t('forgotPassword.backToLogin')}
          </a>
        </div>

        {success && (
          <div className="mt-4 text-center text-xs text-gray-500">
            {t('forgotPassword.spamNote')}
          </div>
        )}
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