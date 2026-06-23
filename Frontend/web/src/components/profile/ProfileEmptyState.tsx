import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface ProfileEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export default function ProfileEmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: ProfileEmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary-700 shadow-sm ring-1 ring-primary-100">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn btn-primary mt-5 min-h-11 px-5">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
