import * as React from 'react';
import { cn } from '@/lib/utils';

export const dropdownMenuItemClass =
  'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:pointer-events-none disabled:text-slate-400';

export const dropdownMenuDangerItemClass =
  'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:pointer-events-none disabled:text-slate-400';

type DropdownMenuProps = React.HTMLAttributes<HTMLDivElement> & {
  showArrow?: boolean;
  arrowClassName?: string;
};

export function DropdownMenu({
  className,
  children,
  showArrow = false,
  arrowClassName,
  ...props
}: DropdownMenuProps) {
  return (
    <div
      className={cn(
        'surface-card animate-fade-up z-20 overflow-hidden rounded-[1.35rem] border-slate-200/70 bg-white/95 p-2 shadow-2xl shadow-slate-900/10',
        className
      )}
      {...props}
    >
      {showArrow && (
        <span
          className={cn(
            'absolute -top-2 right-7 h-4 w-4 rotate-45 border-l border-t border-slate-200/70 bg-white',
            arrowClassName
          )}
        />
      )}
      {children}
    </div>
  );
}

export function DropdownMenuHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative mb-1 rounded-2xl bg-slate-50/90 px-3 py-3', className)} {...props} />;
}

export function DropdownMenuDivider({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn('my-2 border-slate-100', className)} {...props} />;
}

type DropdownMenuItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode;
  danger?: boolean;
};

export function DropdownMenuItem({
  className,
  children,
  icon,
  danger = false,
  type = 'button',
  ...props
}: DropdownMenuItemProps) {
  return (
    <button
      type={type}
      className={cn(danger ? dropdownMenuDangerItemClass : dropdownMenuItemClass, className)}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
