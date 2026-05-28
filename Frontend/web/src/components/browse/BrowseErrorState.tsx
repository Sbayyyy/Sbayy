import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'next-i18next';

interface BrowseErrorStateProps {
  error: string;
  onRetry: () => void;
}

export default function BrowseErrorState({ error, onRetry }: BrowseErrorStateProps) {
  const { t } = useTranslation('common');

  return (
    <div className="app-page flex items-center justify-center px-4 py-16">
      <div className="surface-card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-slate-950">{t('browse.loadError')}</h2>
        <p className="mb-6 text-slate-600">{error}</p>
        <button type="button" onClick={onRetry} className="btn btn-primary">
          {t('common.tryAgain')}
        </button>
      </div>
    </div>
  );
}
