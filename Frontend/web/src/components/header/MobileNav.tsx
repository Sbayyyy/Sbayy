import Link from 'next/link';
import type { User } from '@sbay/shared';
import { useTranslation } from 'next-i18next';

interface MobileNavProps {
  isAuthenticated: boolean;
  user?: User | null;
  isAdmin: boolean;
  loginHref: string;
  registerHref: string;
  onClose: () => void;
  onLogout: () => void;
}

export default function MobileNav({
  isAuthenticated,
  user,
  isAdmin,
  loginHref,
  registerHref,
  onClose,
  onLogout,
}: MobileNavProps) {
  const { t } = useTranslation('common');

  return (
    <div className="animate-fade-up border-t border-slate-200 bg-white md:hidden">
      <nav className="container mx-auto space-y-1 px-4 py-4">
        <Link href="/" className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-primary-700" onClick={onClose}>
          {t('nav.home')}
        </Link>
        <Link href="/browse" className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-primary-700" onClick={onClose}>
          {t('nav.browse')}
        </Link>
        <Link href="/listing/sell" className="block rounded-xl px-3 py-2 font-semibold text-primary-700 hover:bg-primary-50" onClick={onClose}>
          {t('nav.sellNow')}
        </Link>

        {isAuthenticated && user ? (
          <>
            <hr className="my-2 border-slate-100" />
            <div className="rounded-2xl bg-slate-50 px-3 py-3">
              <p className="text-sm text-slate-500">{t('nav.welcome')}</p>
              <p className="font-semibold">{user.name || t('nav.user')}</p>
            </div>
            <Link href="/profile" className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={onClose}>
              {t('nav.profile')}
            </Link>
            <Link href="/dashboard" className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={onClose}>
              {t('nav.dashboard')}
            </Link>
            {isAdmin && (
              <Link href="/manager/dashboard" className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={onClose}>
                Manager dashboard
              </Link>
            )}
            <button type="button" onClick={onLogout} className="block w-full rounded-xl px-3 py-2 text-start text-red-600 hover:bg-red-50">
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <>
            <hr className="my-2 border-slate-100" />
            <Link href={loginHref} className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={onClose}>
              {t('nav.login')}
            </Link>
            <Link href={registerHref} className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={onClose}>
              {t('nav.register')}
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
