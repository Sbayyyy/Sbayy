import { Check, X } from 'lucide-react';
import type { ListingCondition, SearchFilters } from '@sbay/shared';
import { CITIES, FILTER_CATEGORIES, FILTER_CONDITIONS, getCategoryName } from '@/lib/constants';
import { handlePriceKeyDown, createPriceChangeHandler } from '@/lib/hooks/usePriceFilter';
import { useTranslation } from 'next-i18next';
import { Select } from '@/components/ui/select';

interface FilterSidebarProps {
  filters: SearchFilters;
  onFilterChange: (update: Partial<SearchFilters>) => void;
  onClearFilters: () => void;
  showCategories?: boolean;
  showRegion?: boolean;
  showSort?: boolean;
  priceError?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

function toggleArrayValue<T>(arr: T[] | undefined, value: T): T[] {
  const list = arr ?? [];
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

function FilterContent({
  filters,
  onFilterChange,
  onClearFilters,
  showCategories = true,
  showRegion = false,
  showSort = false,
  priceError,
  onClose,
}: Omit<FilterSidebarProps, 'isMobile'>) {
  const { t, i18n } = useTranslation('common');
  const handlePriceChange = createPriceChangeHandler(onFilterChange);

  const sectionTitle = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500';

  const selectedCategories = filters.categories ?? (filters.category ? [filters.category] : []);
  const selectedConditions = filters.conditions ?? (filters.condition ? [filters.condition] : []);
  const selectedRegions = filters.regions ?? (filters.region ? [filters.region] : []);

  const toggleCategory = (slug: string) => {
    onFilterChange({
      categories: toggleArrayValue(selectedCategories, slug),
      category: undefined,
    });
  };

  const toggleCondition = (value: ListingCondition) => {
    onFilterChange({
      conditions: toggleArrayValue(selectedConditions, value),
      condition: undefined,
    });
  };

  const toggleRegion = (value: string) => {
    onFilterChange({
      regions: toggleArrayValue(selectedRegions, value),
      region: undefined,
    });
  };

  return (
    <div className="space-y-7">
      {showSort && (
        <section>
          <h4 className={`${sectionTitle} mb-3`}>{t('filters.sorting')}</h4>
          <Select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={e => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              onFilterChange({
                sortBy: sortBy as SearchFilters['sortBy'],
                sortOrder: sortOrder as SearchFilters['sortOrder'],
              });
            }}
            className="text-sm"
          >
            <option value="date-desc">{t('filters.sortNewest')}</option>
            <option value="date-asc">{t('filters.sortOldest')}</option>
            <option value="price-asc">{t('filters.sortPriceAsc')}</option>
            <option value="price-desc">{t('filters.sortPriceDesc')}</option>
          </Select>
        </section>
      )}

      {showCategories && (
        <section>
          <h4 className={`${sectionTitle} mb-3`}>{t('filters.categoryLabel')}</h4>
          <div className="space-y-1">
            {FILTER_CATEGORIES.map(cat => (
              <CheckboxRow
                key={cat.slug}
                checked={selectedCategories.includes(cat.slug)}
                onToggle={() => toggleCategory(cat.slug)}
                label={getCategoryName(cat, i18n.language)}
              />
            ))}
          </div>
        </section>
      )}

      {showRegion && (
        <section>
          <h4 className={`${sectionTitle} mb-3`}>{t('filters.regionLabel')}</h4>
          <div className="max-h-56 space-y-1 overflow-y-auto pe-1">
            {CITIES.map(city => (
              <CheckboxRow
                key={city.value}
                checked={selectedRegions.includes(city.value)}
                onToggle={() => toggleRegion(city.value)}
                label={t(city.i18nKey, city.i18nDefault)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h4 className={`${sectionTitle} mb-3`}>{t('filters.priceLabel')}</h4>
        <div className="grid grid-cols-2 gap-2.5">
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
        <h4 className={`${sectionTitle} mb-3`}>{t('filters.conditionLabel')}</h4>
        <div className="space-y-1">
          {FILTER_CONDITIONS.map(c => (
            <CheckboxRow
              key={c.value}
              checked={selectedConditions.includes(c.value as ListingCondition)}
              onToggle={() => toggleCondition(c.value as ListingCondition)}
              label={t(c.i18nKey)}
            />
          ))}
        </div>
      </section>

      <div className="pt-2">
        <button
          onClick={() => {
            onClearFilters();
            onClose?.();
          }}
          className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
        >
          {t('filters.resetFilters')}
        </button>
      </div>
    </div>
  );
}

interface CheckboxRowProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
}

function CheckboxRow({ checked, onToggle, label }: CheckboxRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start text-sm font-medium transition-colors ${
        checked ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
          checked
            ? 'border-primary-600 bg-primary-600 text-white'
            : 'border-slate-300 bg-white'
        }`}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

export default function FilterSidebar(props: FilterSidebarProps) {
  const { isMobile, onClose, ...contentProps } = props;
  const { t } = useTranslation('common');

  if (!isMobile) {
    return (
      <aside className="hidden w-64 flex-shrink-0 self-start lg:block">
        <div className="surface-card sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200/60 px-5 py-4">
            <h3 className="text-base font-bold text-slate-950">{t('filters.filterResults')}</h3>
          </div>
          <div className="filter-sidebar-scroll flex-1 overflow-y-auto px-5 py-5">
            <FilterContent {...contentProps} />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={onClose}>
      <div
        className="animate-in slide-in-from-right fixed inset-y-0 end-0 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto bg-white shadow-2xl duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-950">{t('filters.filterResults')}</h3>
            <button onClick={onClose} className="icon-button" aria-label="Close filters">
              <X size={18} />
            </button>
          </div>
          <FilterContent {...contentProps} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
