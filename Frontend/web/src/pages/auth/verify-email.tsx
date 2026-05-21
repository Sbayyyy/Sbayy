import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { verifyEmail } from '@/lib/api/auth';
import { getCurrentUser } from '@/lib/api/users';
import { useAuthStore } from '@/lib/store';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { isAuthenticated, setUser } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [loginHref, setLoginHref] = useState('/auth/login?verified=true');

  useEffect(() => {
    if (!router.isReady) return;

    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(hash);
    const token = params.get('token') ?? '';
    const redirect = params.get('redirect') ?? '';
    const redirectSuffix = redirect.startsWith('/') && !redirect.startsWith('//')
      ? `&redirect=${encodeURIComponent(redirect)}`
      : '';
    setLoginHref(`/auth/login?verified=true${redirectSuffix}`);

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    const run = async () => {
      try {
        await verifyEmail(token);
        if (isAuthenticated) {
          const user = await getCurrentUser();
          setUser(user);
        }
        setStatus('success');
        setMessage(isAuthenticated ? 'Email verified successfully. You can continue using SBay.' : 'Email verified successfully. You can now sign in.');
      } catch {
        setStatus('error');
        setMessage('This verification link is invalid or expired.');
      }
    };

    void run();
  }, [isAuthenticated, router.isReady, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        {status === 'loading' && <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary-600" />}
        {status === 'success' && <CheckCircle className="mx-auto mb-4 h-10 w-10 text-emerald-600" />}
        {status === 'error' && <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />}
        <h1 className="text-xl font-semibold text-slate-950">Email verification</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        {status !== 'loading' && (
          <Link href={isAuthenticated ? '/' : loginHref} className="btn btn-primary mt-6">
            {isAuthenticated ? 'Continue' : 'Go to login'}
          </Link>
        )}
      </div>
    </div>
  );
}
