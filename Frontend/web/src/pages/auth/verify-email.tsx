import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { verifyEmail } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = typeof router.query.token === 'string' ? router.query.token : '';
    if (!router.isReady || !token) return;

    const run = async () => {
      try {
        const auth = await verifyEmail(token);
        login(auth.user, auth.token, auth.refreshToken);
        setStatus('success');
        setMessage('Email verified. Signing you in...');
        const redirect = typeof router.query.redirect === 'string' ? router.query.redirect : '/';
        await router.replace(redirect);
      } catch {
        setStatus('error');
        setMessage('This verification link is invalid or expired.');
      }
    };

    void run();
  }, [login, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        {status === 'loading' && <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary-600" />}
        {status === 'success' && <CheckCircle className="mx-auto mb-4 h-10 w-10 text-emerald-600" />}
        {status === 'error' && <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />}
        <h1 className="text-xl font-semibold text-slate-950">Email verification</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        {status === 'error' && (
          <Link href="/auth/login" className="btn btn-primary mt-6">
            Back to login
          </Link>
        )}
      </div>
    </div>
  );
}
