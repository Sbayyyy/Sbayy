import { SearchFilters } from '@sbay/shared';
import { FILTER_CATEGORIES, FILTER_CONDITIONS } from '@/lib/constants';
import { useTranslation } from 'next-i18next';

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
  const { t } = useTranslation('common');
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Category Filter */}
        <select
          value={filters.category}
          onChange={(e) => onFilterChange({ category: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">{t('filters.allCategories')}</option>
          {FILTER_CATEGORIES.map(cat => (
            <option key={cat.slug} value={cat.slug}>{cat.name}</option>
          ))}
        </select>

        {/* Price Range */}
        <input
          type="number"
          placeholder={t('filters.priceFrom')}
          value={filters.minPrice || ''}
          onChange={(e) => onFilterChange({ minPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        />
        <input
          type="number"
          placeholder={t('filters.priceTo')}
          value={filters.maxPrice || ''}
          onChange={(e) => onFilterChange({ maxPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        />

        {/* Condition Filter */}
        <select
          value={filters.condition || ''}
          onChange={(e) => onFilterChange({ condition: e.target.value as SearchFilters['condition'] })}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">{t('filters.allConditions')}</option>
          {FILTER_CONDITIONS.map(cond => (
            <option key={cond.value} value={cond.value}>{cond.labelAr}</option>
          ))}
        </select>
      </div>

      {/* Region Filter */}
      <div className="mt-4">
        <input
          type="text"
          placeholder={t('filters.regionPlaceholder')}
          value={filters.region}
          onChange={(e) => onFilterChange({ region: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onApply}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {t('filters.applyFilters')}
        </button>
        <button
          onClick={onReset}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          {t('filters.resetFilters')}
        </button>
      </div>
    </div>
  );
}
