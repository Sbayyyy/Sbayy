import { useState } from 'react';
import { useRouter } from 'next/router';
import { isValidEmail } from '@sbay/shared';

export default function Login() {
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');

    const router = useRouter();
  
    const validateForm = (): boolean => {
        const newErrors: { email: string; password: string } = { email: '', password: '' };
        if(!email){
            newErrors.email = 'عنوان البريد الإلكتروني مطلوب';
        } else if (!isValidEmail(email)) {
            newErrors.email = 'عنوان البريد الإلكتروني غير صالح';
        }
        if(!password || password.length < 6){
            newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        }
        setErrors(newErrors);
        return !newErrors.email && !newErrors.password;
            
    };
  

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsLoading(true);
        setApiError('');
        try {
          //TODO: change the URL to the correct backend endpoint
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                     email: email,
                     password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setApiError(data.message || 'حدث خطأ أثناء تسجيل الدخول');
            } else {
                // Erfolgreich eingeloggt, weiterleiten
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                router.push('/');
            }
        } catch (error) {
            setApiError('خطأ في الاتصال بالخادم');
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
          <img
            alt="Sbayy Logo"
            src="/sbay_icon.svg"
            className="mx-auto h-10 w-auto"
          />
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-black">تسجيل الدخول إلى حسابك</h2>
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
                عنوان البريد الإلكتروني
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  كلمة المرور
                </label>
                <div className="text-sm">
                  <a href="forget_password" className="font-semibold text-indigo-400 hover:text-indigo-300">
                    نسيت كلمة المرور؟
                  </a>
                </div>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>
            </div>
          </form>

            <div className="mt-4 text-center text-sm">
                <a href="register" className="font-semibold text-indigo-400 hover:text-indigo-300">
                    ليس لديك حساب؟ سجل الآن
                  </a>
            </div>
        </div>
      </div>
    </>
  )
}
