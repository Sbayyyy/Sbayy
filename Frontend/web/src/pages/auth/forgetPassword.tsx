import { useState } from 'react';
import { getEmailValidationMessage, sanitizeInput } from '@sbay/shared';
import { forgotPassword } from '../../lib/api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateForm = (): boolean => {
    const emailError = getEmailValidationMessage(email);
    if (emailError) {
      setError(emailError);
      return false;
    }
    setError('');
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(sanitizeInput(e.target.value));
    // Clear errors when user starts typing
    if (error) setError('');
    if (apiError) setApiError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setApiError('');
    setSuccess(false);

    try {
      await forgotPassword(email);
      
      setSuccess(true);
      setEmail(''); // Clear email field on success
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'خطأ في الاتصال بالخادم');
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
          استعادة كلمة المرور
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          أدخل عنوان بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {/* Success Message */}
        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">
              ✓ تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني
            </span>
          </div>
        )}

        {/* API Error Banner */}
        {apiError && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm/6 font-medium text-black-100">
              عنوان البريد الإلكتروني
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
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
                  error ? 'border-2 border-red-500' : ''
                }`}
              />
              {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading || success}
              className={`flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                (isLoading || success) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'جارٍ الإرسال...' : success ? 'تم الإرسال ✓' : 'إرسال رابط الاستعادة'}
            </button>
          </div>
        </form>

        {/* Back to Login Link */}
        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-sm font-semibold text-indigo-400 hover:text-indigo-300"
          >
            ← العودة إلى تسجيل الدخول
          </a>
        </div>

        {/* Additional Info */}
        {success && (
          <div className="mt-4 text-center text-xs text-gray-500">
            لم تستلم البريد الإلكتروني؟ تحقق من مجلد الرسائل غير المرغوب فيها
          </div>
        )}
      </div>
    </div>
  );
}