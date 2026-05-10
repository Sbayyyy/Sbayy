import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { User, Menu, X, Heart, Package, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
// import { useCartStore } from '@/lib/cartStore';
import { useTranslation } from 'next-i18next';
import { createChatConnection, onMessageNew, onMessagesRead, onMessageDeleted, type RealtimeDelete } from '@/lib/realtime/chat';
import { getUnreadCount } from '@/lib/api/messages';
import type { Message } from '@sbay/shared';
import { config } from '@/lib/config';

export default function Header() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { user, isAuthenticated, logout } = useAuthStore();
  // const { itemCount } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const redirectParam = encodeURIComponent(router.asPath);
  const loginHref = `/auth/login?redirect=${redirectParam}`;
  const registerHref = `/auth/register?redirect=${redirectParam}`;

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

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setUnreadTotal(0);
      return;
    }
    let isMounted = true;
    let connection: Awaited<ReturnType<typeof createChatConnection>> | null = null;

    const loadInitial = async () => {
      const total = await getUnreadCount();
      if (isMounted) setUnreadTotal(total);
    };

    const connect = async () => {
      try {
        connection = await createChatConnection();
        if (!isMounted) return;
        onMessageNew(connection, (incoming: Message) => {
          if (incoming.receiverId === user.id) {
            setUnreadTotal((prev) => prev + 1);
          }
        });
        onMessagesRead(connection, (payload) => {
          if (payload.readerId !== user.id) return;
          void getUnreadCount().then((total) => {
            if (isMounted) setUnreadTotal(total);
          });
        });
        onMessageDeleted(connection, (payload: RealtimeDelete) => {
          if (payload.receiverId !== user.id || payload.isRead) return;
          setUnreadTotal((prev) => Math.max(0, prev - 1));
        });
        await connection.start();
      } catch {
      }
    };

    void loadInitial();
    void connect();

    return () => {
      isMounted = false;
      if (connection) {
        void connection.stop();
      }
    };
  }, [isAuthenticated, user?.id]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center" aria-label={t('header.brandName')}>
              <img
                src={config.logoUrl}
                alt={t('header.brandName')}
                className="h-8 w-auto max-w-[7.5rem] object-contain sm:h-9"
              />
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

            {/* Cart feature disabled */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="relative flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-1.5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
                  aria-expanded={userMenuOpen}
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-100 ring-2 ring-white">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user?.name || t('nav.user')} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-primary-600">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <span className="hidden max-w-28 truncate text-sm font-semibold text-slate-700 lg:block">
                    {user?.name || t('nav.user')}
                  </span>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="surface-card absolute left-0 z-20 mt-2 w-56 overflow-hidden py-2">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-xs text-slate-500">{t('nav.welcome')}</p>
                        <p className="truncate font-semibold text-slate-900">{user?.name || t('nav.user')}</p>
                      </div>
                      <Link href="/profile" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setUserMenuOpen(false)}>
                        {t('nav.profile')}
                      </Link>
                      <Link href="/seller/my-listings" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setUserMenuOpen(false)}>
                        {t('nav.myListings')}
                      </Link>
                      <Link href="/messages" className="flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setUserMenuOpen(false)}>
                        <span>{t('nav.messages')}</span>
                        {unreadTotal > 0 && (
                          <span className="inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                            {unreadTotal > 99 ? '99+' : unreadTotal}
                          </span>
                        )}
                      </Link>
                      <Link href="/profile/settings" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setUserMenuOpen(false)}>
                        {t('profile.accountSettings')}
                      </Link>
                      <hr className="my-2 border-slate-100" />
                      <button onClick={handleLogout} className="block w-full px-4 py-2.5 text-right text-sm font-medium text-red-600 hover:bg-red-50">
                        {t('nav.logout')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href={loginHref} className="btn btn-outline hidden border-primary-200 text-primary-700 hover:bg-primary-50 md:flex">
                <User size={18} />
                {t('nav.login')}
              </Link>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="icon-button md:hidden" aria-label="Menu">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="animate-fade-up border-t border-slate-200 bg-white md:hidden">
          <nav className="container mx-auto space-y-1 px-4 py-4">
            <Link href="/" className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-primary-700" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.home')}
            </Link>
            <Link href="/browse" className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-primary-700" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.browse')}
            </Link>
            <Link href="/categories" className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-primary-700" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.categories')}
            </Link>
            <Link href="/listing/sell" className="block rounded-xl px-3 py-2 font-semibold text-primary-700 hover:bg-primary-50" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.sellNow')}
            </Link>

            {isAuthenticated && user ? (
              <>
                <hr className="my-2 border-slate-100" />
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-sm text-slate-500">{t('nav.welcome')}</p>
                  <p className="font-semibold">{user?.name || t('nav.user')}</p>
                </div>
                <Link href="/profile" className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                  {t('nav.profile')}
                </Link>
                <Link href="/dashboard" className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                  {t('nav.dashboard')}
                </Link>
                <button onClick={handleLogout} className="block w-full rounded-xl px-3 py-2 text-right text-red-600 hover:bg-red-50">
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <hr className="my-2 border-slate-100" />
                <Link href={loginHref} className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                  {t('nav.login')}
                </Link>
                <Link href={registerHref} className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                  {t('nav.register')}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
