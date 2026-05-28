import Link from 'next/link';
import { useRouter } from 'next/router';
import { Heart, Menu, MessageCircle, Package, User, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useAuthStore } from '@/lib/store';
import { config } from '@/lib/config';
import LanguageToggle from './LanguageToggle';
import MobileNav from './header/MobileNav';
import UserMenu from './header/UserMenu';
import { useDetachedHeader } from './header/useDetachedHeader';
import { useUnreadMessages } from './header/useUnreadMessages';

export default function Header() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const scrolled = useDetachedHeader();
  const unreadTotal = useUnreadMessages({ isAuthenticated, userId: user?.id });
  const redirectParam = encodeURIComponent(router.asPath);
  const loginHref = `/auth/login?redirect=${redirectParam}`;
  const registerHref = `/auth/register?redirect=${redirectParam}`;
  const isAdmin = user?.role === 'admin';
  const detached = scrolled || mobileMenuOpen;

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
  };

  const navLinkClass = (href: string) =>
    `rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
      router.pathname === href
        ? 'bg-primary-50 text-primary-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
    }`;

  return (
    <header
      data-detached={detached || undefined}
      className={`sticky top-0 z-50 transition-all duration-300 ease-out ${
        detached
          ? 'header-detached border-b border-slate-200/70 bg-white/90 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold tracking-normal text-primary-600 transition-colors hover:text-primary-700">
              <img
                src={config.logoUrl}
                alt={t('header.logoAlt')}
                className="h-9 w-9 rounded-xl object-contain"
              />
              <span className="hidden sm:inline">{t('header.brandName')}</span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              <Link href="/" className={navLinkClass('/')}>
                {t('nav.home')}
              </Link>
              <Link href="/browse" className={navLinkClass('/browse')}>
                {t('nav.browse')}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle className="hidden sm:inline-flex" />
            <LanguageToggle variant="compact" className="sm:hidden" />

            <Link href="/listing/sell" className="btn btn-primary hidden md:flex">
              <Package size={18} />
              {t('nav.sellNow')}
            </Link>

            <Link href="/favorites" className="icon-button" aria-label={t('nav.favorites')}>
              <Heart size={20} />
            </Link>

            <Link href="/messages" className="icon-button relative" aria-label={t('nav.messages')}>
              <MessageCircle size={20} />
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unreadTotal > 99 ? '99+' : unreadTotal}
                </span>
              )}
            </Link>

            {isAuthenticated && user ? (
              <UserMenu
                user={user}
                isAdmin={isAdmin}
                open={userMenuOpen}
                unreadTotal={unreadTotal}
                onOpenChange={setUserMenuOpen}
                onLogout={handleLogout}
              />
            ) : (
              <Link href={loginHref} className="btn btn-outline hidden border-primary-200 text-primary-700 hover:bg-primary-50 md:flex">
                <User size={18} />
                {t('nav.login')}
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(open => !open)}
              className="icon-button md:hidden"
              aria-label={t('nav.menu', 'Menu')}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <MobileNav
          isAuthenticated={isAuthenticated}
          user={user}
          isAdmin={isAdmin}
          loginHref={loginHref}
          registerHref={registerHref}
          onClose={() => setMobileMenuOpen(false)}
          onLogout={handleLogout}
        />
      )}
    </header>
  );
}
