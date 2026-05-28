import { AlertCircle } from 'lucide-react';
import EmptyState from './empty-state';

interface PageErrorProps {
  title: string;
  description?: string;
  /** Label for the retry button. When omitted, the retry button is hidden. */
  retryLabel?: string;
  onRetry?: () => void;
}

/**
 * Centered page-level error block. Use when an initial data fetch fails
 * (the page can't render its main content). For inline / per-action errors,
 * use a toast instead.
 */
export default function PageError({ title, description, retryLabel, onRetry }: PageErrorProps) {
  return (
    <div className="app-page flex items-center justify-center px-4 py-16">
      <EmptyState
        icon={AlertCircle}
        iconTone="rose"
        title={title}
        description={description}
        actions={onRetry && retryLabel ? (
          <button onClick={onRetry} className="btn btn-primary">{retryLabel}</button>
        ) : undefined}
      />
    </div>
  );
}
