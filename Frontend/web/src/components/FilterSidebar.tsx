import { SlidersHorizontal, X } from 'lucide-react';
import type { SearchFilters } from '@sbay/shared';
import { FILTER_CATEGORIES, FILTER_CONDITIONS } from '@/lib/constants';
import { handlePriceKeyDown, createPriceChangeHandler } from '@/lib/hooks/usePriceFilter';
import { useTranslation } from 'next-i18next';

interface FilterSidebarProps {
  filters: SearchFilters;
  onFilterChange: (update: Partial<SearchFilters>) => void;
  onClearFilters: () => void;
  showCategories?: boolean;
  showSort?: boolean;
  priceError?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

function FilterContent({
  filters,
  onFilterChange,
  onClearFilters,
  showCategories = true,
  showSort = false,
  priceError,
  onClose,
}: Omit<FilterSidebarProps, 'isMobile'>) {
  const { t } = useTranslation('common');
  const handlePriceChange = createPriceChangeHandler(onFilterChange);
  const optionClass = (active: boolean) =>
    `block w-full rounded-xl px-3 py-2 text-right text-sm font-medium transition-all ${
      active
        ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-100'
        : 'text-slate-700 hover:bg-slate-50'
    }`;

  return (
    <div className="space-y-6">
      {showSort && (
        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-800">{t('filters.sorting')}</h4>
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              onFilterChange({ sortBy: sortBy as SearchFilters['sortBy'], sortOrder: sortOrder as SearchFilters['sortOrder'] });
            }}
            className="input text-sm"
          >
            <option value="date-desc">{t('filters.sortNewest')}</option>
            <option value="date-asc">{t('filters.sortOldest')}</option>
            <option value="price-asc">{t('filters.sortPriceAsc')}</option>
            <option value="price-desc">{t('filters.sortPriceDesc')}</option>
          </select>
        </section>
      )}

      {showCategories && (
        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-800">{t('filters.categoryLabel')}</h4>
          <div className="space-y-1">
            <button
              onClick={() => {
                onFilterChange({ category: '' });
                onClose?.();
              }}
              className={optionClass(!filters.category)}
            >
              {t('filters.allCategories')}
            </button>
            {FILTER_CATEGORIES.map(cat => (
              <button
                key={cat.slug}
                onClick={() => {
                  onFilterChange({ category: cat.slug });
                  onClose?.();
                }}
                className={optionClass(filters.category === cat.slug)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h4 className="mb-3 text-sm font-semibold text-slate-800">{t('filters.priceLabel')}</h4>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            placeholder={t('filters.priceFrom')}
            value={filters.minPrice ?? ''}
            onKeyDown={handlePriceKeyDown}
            onChange={handlePriceChange('minPrice')}
            className="input text-sm"
          />
          <input
            type="number"
            placeholder={t('filters.priceTo')}
            value={filters.maxPrice || ''}
            onKeyDown={handlePriceKeyDown}
            onChange={handlePriceChange('maxPrice')}
            className="input text-sm"
          />
        </div>
        {priceError && <p className="mt-2 text-xs font-medium text-red-600">{priceError}</p>}
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-slate-800">{t('filters.conditionLabel')}</h4>
        <div className="space-y-2">
          {[
            { value: undefined as string | undefined, label: t('filters.allConditions') },
            ...FILTER_CONDITIONS.map(c => ({ value: c.value as string | undefined, label: c.labelAr }))
          ].map(item => (
            <label key={item.label} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50">
              <input
                type="radio"
                name="condition-filter"
                checked={filters.condition === item.value}
                onChange={() => onFilterChange({ condition: item.value as SearchFilters['condition'] })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </section>

      <button
        onClick={() => {
          onClearFilters();
          onClose?.();
        }}
        className="btn btn-outline w-full"
      >
        {t('filters.resetFilters')}
      </button>
    </div>
  );
}

export default function FilterSidebar(props: FilterSidebarProps) {
  const { isMobile, onClose, ...contentProps } = props;
  const { t } = useTranslation('common');

  if (!isMobile) {
    return (
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <div className="surface-card sticky top-24 p-5">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-700">
              <SlidersHorizontal size={18} />
            </div>
            <h3 className="text-lg font-bold text-slate-950">{t('filters.filterResults')}</h3>
          </div>
          <FilterContent {...contentProps} />
        </div>
      </aside>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={onClose}>
      <div
        className="animate-in slide-in-from-right fixed inset-y-0 right-0 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto bg-white shadow-2xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <SlidersHorizontal size={18} />
              </div>
              <h3 className="text-lg font-bold text-slate-950">{t('filters.filterResults')}</h3>
            </div>
            <button onClick={onClose} className="icon-button" aria-label="Close filters">
              <X size={20} />
            </button>
          </div>
          <FilterContent {...contentProps} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
