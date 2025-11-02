import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  getUsernameValidationMessage,
  getEmailValidationMessage,
  getPhoneValidationMessage,
  getPasswordStrengthMessage,
  passwordsMatch,
  sanitizeInput
} from '@sbay/shared';
import { register } from '../lib/api/auth';

export default function Register() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState<{
        username?: string,
        email?: string,
        phone?: string,
        password?: string,
        confirmPassword?: string
    }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    
    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};
        // Username validation
        const userNameError = getUsernameValidationMessage(sanitizeInput(formData.username));
        if(userNameError) newErrors.username = userNameError;
        // Email validation
        const emailError = getEmailValidationMessage(sanitizeInput(formData.email));
        if(emailError) newErrors.email = emailError;
        // Phone validation
        const phoneError = getPhoneValidationMessage(sanitizeInput(formData.phone));
        if(phoneError) newErrors.phone = phoneError;
        // Password validation
        const passwordError = getPasswordStrengthMessage(formData.password);
        if(passwordError){
            newErrors.password = passwordError;

        }else if (!formData.password) {
            newErrors.password = 'كلمة المرور مطلوبة';
            }
        // Confirm password validation
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'تأكيد كلمة المرور مطلوبة';
        } else if (!passwordsMatch(formData.password, formData.confirmPassword)) {
            newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;

    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        setErrors(prev => ({
            ...prev,
            [name]: undefined
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
                password: formData.password
            });
            
            // Registration successful, redirect to login
            router.push('/login?registered=true');
        } catch (error: any) {
            setApiError(error.response?.data?.message || 'خطأ في الاتصال بالخادم');
        } finally {
            setIsLoading(false);
        }
    }

    return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Sbayy Logo"
          src="/sbay_icon.svg"
          className="mx-auto h-10 w-auto"
        />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-black">
          إنشاء حساب جديد
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
              اسم المستخدم
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
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
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
              عنوان البريد الإلكتروني
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
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
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
              رقم الهاتف
            </label>
            <div className="mt-2">
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
                required
                autoComplete="tel"
                placeholder="0912345678"
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
                  errors.phone ? 'border-2 border-red-500' : ''
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm/6 font-medium text-black-100">
              كلمة المرور
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
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
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
              تأكيد كلمة المرور
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
                className={`block w-full rounded-md bg-black/5 px-3 py-1.5 text-base text-black outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 ${
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
              className={`flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'جارٍ إنشاء الحساب...' : 'إنشاء حساب'}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center text-sm">
          <a href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
            لديك حساب بالفعل؟ سجل الدخول
          </a>
        </div>
      </div>
    </div>
  );
}