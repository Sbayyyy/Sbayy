import Link from 'next/link';
import { ChevronDown, LogOut, MessageCircle, Settings, ShieldCheck, Store, UserCircle } from 'lucide-react';
import type { User } from '@sbay/shared';
import { useTranslation } from 'next-i18next';
import {
  DropdownMenu,
  DropdownMenuDivider,
  DropdownMenuHeader,
  dropdownMenuDangerItemClass,
  dropdownMenuItemClass,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  user: User;
  isAdmin: boolean;
  open: boolean;
  unreadTotal: number;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
}

export default function UserMenu({ user, isAdmin, open, unreadTotal, onOpenChange, onLogout }: UserMenuProps) {
  const { t } = useTranslation('common');
  const displayName = user.name || t('nav.user');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="relative flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 ps-2 pe-2 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-expanded={open}
      >
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-100 ring-2 ring-white">
          {user.avatar ? (
            <img src={user.avatar} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-primary-600">
              {displayName.charAt(0).toUpperCase() || 'U'}
            </span>
          )}
        </div>
        <span className="hidden max-w-28 truncate text-sm font-semibold text-slate-700 lg:block">
          {displayName}
        </span>
        <ChevronDown
          size={16}
          className={`hidden text-slate-400 transition-transform duration-200 lg:block ${open ? 'rotate-180 text-primary-600' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => onOpenChange(false)} />
          <DropdownMenu className="absolute end-0 mt-3 w-72" showArrow>
            <DropdownMenuHeader className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 ring-4 ring-white">
                {user.avatar ? (
                  <img src={user.avatar} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-base font-bold text-primary-600">
                    {displayName.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{t('nav.welcome')}</p>
                <p className="truncate text-sm font-bold text-slate-950">{displayName}</p>
              </div>
            </DropdownMenuHeader>
            <Link href="/profile" className={dropdownMenuItemClass} onClick={() => onOpenChange(false)}>
              <UserCircle size={18} className="text-slate-400" />
              <span>{t('nav.profile')}</span>
            </Link>
            <Link href="/seller/my-listings" className={dropdownMenuItemClass} onClick={() => onOpenChange(false)}>
              <Store size={18} className="text-slate-400" />
              <span>{t('nav.myListings')}</span>
            </Link>
            <Link href="/messages" className={`${dropdownMenuItemClass} justify-between`} onClick={() => onOpenChange(false)}>
              <span className="flex items-center gap-3">
                <MessageCircle size={18} className="text-slate-400" />
                <span>{t('nav.messages')}</span>
              </span>
              {unreadTotal > 0 && (
                <span className="inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  {unreadTotal > 99 ? '99+' : unreadTotal}
                </span>
              )}
            </Link>
            <Link href="/profile/settings" className={dropdownMenuItemClass} onClick={() => onOpenChange(false)}>
              <Settings size={18} className="text-slate-400" />
              <span>{t('profile.accountSettings')}</span>
            </Link>
            {isAdmin && (
              <Link href="/manager/dashboard" className={dropdownMenuItemClass} onClick={() => onOpenChange(false)}>
                <ShieldCheck size={18} className="text-slate-400" />
                <span>Manager dashboard</span>
              </Link>
            )}
            <DropdownMenuDivider />
            <button type="button" onClick={onLogout} className={dropdownMenuDangerItemClass}>
              <LogOut size={18} />
              <span>{t('nav.logout')}</span>
            </button>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}
