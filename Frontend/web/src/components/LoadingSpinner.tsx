import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export default function LoadingSpinner({
  message,
  size = 'lg',
  fullPage = false,
}: LoadingSpinnerProps) {
  const content = (
    <div className="text-center">
      <Loader2 className={`${sizeClasses[size]} text-primary-600 animate-spin mx-auto`} />
      {message && <p className="mt-4 font-medium text-slate-600">{message}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="app-page flex min-h-screen items-center justify-center px-4">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
}
