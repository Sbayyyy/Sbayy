import { SearchFilters } from '@sbay/shared';
import { FILTER_CATEGORIES, FILTER_CONDITIONS, getCategoryName } from '@/lib/constants';
import { useTranslation } from 'next-i18next';
import { Select } from '@/components/ui/select';

interface SearchFiltersPanelProps {
  filters: SearchFilters;
  onFilterChange: (update: Partial<SearchFilters>) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function SearchFiltersPanel({
  filters,
  onFilterChange,
  onApply,
  onReset,
}: SearchFiltersPanelProps) {
  const { t, i18n } = useTranslation('common');
  return (
    <div className="toolbar-surface mt-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Select
          value={filters.category}
          onChange={(e) => onFilterChange({ category: e.target.value })}
        >
          <option value="">{t('filters.allCategories')}</option>
          {FILTER_CATEGORIES.map(cat => (
            <option key={cat.slug} value={cat.slug}>{getCategoryName(cat, i18n.language)}</option>
          ))}
        </Select>

        <input
          type="number"
          placeholder={t('filters.priceFrom')}
          value={filters.minPrice || ''}
          onChange={(e) => onFilterChange({ minPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
          className="input"
        />
        <input
          type="number"
          placeholder={t('filters.priceTo')}
          value={filters.maxPrice || ''}
          onChange={(e) => onFilterChange({ maxPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
          className="input"
        />

        <Select
          value={filters.condition || ''}
          onChange={(e) => onFilterChange({ condition: e.target.value as SearchFilters['condition'] })}
        >
          <option value="">{t('filters.allConditions')}</option>
          {FILTER_CONDITIONS.map(cond => (
            <option key={cond.value} value={cond.value}>{t(cond.i18nKey)}</option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        <input
          type="text"
          placeholder={t('filters.regionPlaceholder')}
          value={filters.region}
          onChange={(e) => onFilterChange({ region: e.target.value })}
          className="input"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onApply}
          className="btn btn-primary"
        >
          {t('filters.applyFilters')}
        </button>
        <button
          onClick={onReset}
          className="btn btn-outline"
        >
          {t('filters.resetFilters')}
        </button>
      </div>
    </div>
  );
}
