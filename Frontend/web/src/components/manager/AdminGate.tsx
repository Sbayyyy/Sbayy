import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/api/users';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useAuthStore } from '@/lib/store';

interface AdminGateProps {
  children: ReactNode;
}

export default function AdminGate({ children }: AdminGateProps) {
  const isAuthenticated = useRequireAuth();
  const { user, setUser } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (user?.role) return;

    setIsRefreshing(true);
    void getCurrentUser()
      .then(setUser)
      .finally(() => setIsRefreshing(false));
  }, [isAuthenticated, setUser, user?.role]);

  if (!isAuthenticated || isRefreshing) {
    return <div className="py-10 text-gray-600">Loading...</div>;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm">This page is only available to active admin accounts.</p>
          <Link href="/" className="mt-4 inline-flex text-sm font-semibold text-red-700 underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
