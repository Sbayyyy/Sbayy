import { Search, X } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { defaultTextInputValidator } from '@sbay/shared';
import type { FormEvent } from 'react';

interface BrowseCommandBarProps {
  searchQuery: string;
  searchError: string;
  onSearchQueryChange: (query: string) => void;
  onSearchErrorChange: (error: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}

export default function BrowseCommandBar({
  searchQuery,
  searchError,
  onSearchQueryChange,
  onSearchErrorChange,
  onSubmit,
  onClear,
}: BrowseCommandBarProps) {
  const { t } = useTranslation('common');

  return (
    <div className="browse-sticky-bar sticky top-16 z-30">
      <div className="container mx-auto px-4 py-4 sm:py-5">
        <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
          <div className="hero-command-bar flex flex-col sm:flex-row sm:items-stretch">
            <div className="relative flex flex-1 items-center">
              <Search
                className="pointer-events-none absolute start-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={event => {
                  const next = event.target.value;
                  onSearchQueryChange(next);
                  const validation = defaultTextInputValidator.validate(next);
                  onSearchErrorChange(validation.isValid ? '' : validation.message ?? '');
                }}
                placeholder={t('home.heroSearchPlaceholder')}
                className="hero-command-input ps-12 pe-10"
                aria-label={t('search.placeholder')}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={onClear}
                  className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label={t('common.clear', 'Clear')}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button type="submit" className="hero-command-submit justify-center sm:justify-start">
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>{t('home.heroSearchCta')}</span>
            </button>
          </div>
        </form>
        {searchError && (
          <p className="mx-auto mt-2 max-w-3xl text-center text-sm font-medium text-red-600">
            {searchError}
          </p>
        )}
      </div>
    </div>
  );
}
