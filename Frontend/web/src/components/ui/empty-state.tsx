import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  /** Tone of the icon halo. Defaults to 'primary'. */
  iconTone?: 'primary' | 'amber' | 'rose' | 'slate' | 'emerald';
  title: string;
  description?: string;
  /** Action buttons or links — rendered in a single row, wraps on mobile. */
  actions?: ReactNode;
  /** When true, drops the surface-card wrapper so the caller can place this inside its own card. */
  flat?: boolean;
  className?: string;
}

const TONE_CLASS: Record<NonNullable<EmptyStateProps['iconTone']>, string> = {
  primary: 'bg-primary-50 text-primary-600',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-500',
  emerald: 'bg-emerald-50 text-emerald-600',
};

/**
 * Centered empty-state block. Used wherever a list has zero items —
 * favorites, browse with no results, my-listings, etc. Keeps the visual
 * language consistent so we don't have N hand-rolled variants drifting.
 */
export default function EmptyState({
  icon: Icon,
  iconTone = 'primary',
  title,
  description,
  actions,
  flat = false,
  className,
}: EmptyStateProps) {
  const wrapperClass = flat
    ? `flex items-center justify-center p-10 sm:p-14 ${className ?? ''}`
    : `surface-card flex items-center justify-center p-10 sm:p-14 ${className ?? ''}`;

  return (
    <div className={wrapperClass}>
      <div className="mx-auto max-w-md text-center">
        {Icon && (
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${TONE_CLASS[iconTone]}`}>
            <Icon className="h-8 w-8" />
          </div>
        )}
        <h2 className="mb-2 text-xl font-bold text-slate-950">{title}</h2>
        {description && <p className="mb-6 text-slate-600">{description}</p>}
        {actions && (
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
