import { Search } from 'lucide-react';
import { useTranslation } from 'next-i18next';

interface BrowseEmptyStateProps {
  debouncedQuery: string;
  hasActiveFilters: boolean;
  onReset: () => void;
  onSell: () => void;
}

export default function BrowseEmptyState({ debouncedQuery, hasActiveFilters, onReset, onSell }: BrowseEmptyStateProps) {
  const { t } = useTranslation('common');

  return (
    <div className="surface-card flex items-center justify-center p-10 sm:p-14">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
          <Search className="h-8 w-8 text-primary-600" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-slate-950">
          {debouncedQuery
            ? t('search.noResultsFor', { query: debouncedQuery })
            : t('common.noProducts')}
        </h2>
        <p className="mb-6 text-slate-600">
          {debouncedQuery
            ? t('search.noResultsSuggestion')
            : t('browse.noProductsMatch')}
        </p>
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
          {(hasActiveFilters || debouncedQuery) && (
            <button
              type="button"
              onClick={onReset}
              className="btn btn-outline"
            >
              {t('filters.resetFilters')}
            </button>
          )}
          <button type="button" onClick={onSell} className="btn btn-primary">
            {t('browse.addFirstProduct')}
          </button>
        </div>
      </div>
    </div>
  );
}
