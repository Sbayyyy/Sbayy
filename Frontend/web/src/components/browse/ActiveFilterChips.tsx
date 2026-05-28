import { X } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import type { ListingCondition, SearchFilters } from '@sbay/shared';
import { FILTER_CATEGORIES, FILTER_CONDITIONS, getCategoryName, getCityI18nKeyFromValue, getCityLabel } from '@/lib/constants';

interface ActiveFilterChipsProps {
  filters: SearchFilters;
  selectedCategories: string[];
  selectedConditions: ListingCondition[];
  selectedRegions: string[];
  onRemoveCategory: (slug: string) => void;
  onRemoveCondition: (value: ListingCondition) => void;
  onRemoveRegion: (value: string) => void;
  onFilterChange: (update: Partial<SearchFilters>) => void;
  onClearFilters: () => void;
}

export default function ActiveFilterChips({
  filters,
  selectedCategories,
  selectedConditions,
  selectedRegions,
  onRemoveCategory,
  onRemoveCondition,
  onRemoveRegion,
  onFilterChange,
  onClearFilters,
}: ActiveFilterChipsProps) {
  const { t, i18n } = useTranslation('common');

  const conditionLabel = (value?: string) => {
    if (!value) return '';
    const condition = FILTER_CONDITIONS.find(item => item.value === value);
    return condition ? t(condition.i18nKey) : value;
  };

  const categoryLabel = (slug?: string) => {
    if (!slug) return '';
    const category = FILTER_CATEGORIES.find(item => item.slug === slug);
    return category ? getCategoryName(category, i18n.language) : slug;
  };

  const regionLabel = (value?: string) => {
    if (!value) return '';
    const key = getCityI18nKeyFromValue(value);
    return key ? t(key, getCityLabel(value, i18n.language)) : getCityLabel(value, i18n.language);
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {t('filters.activeFilters')}
      </span>
      {selectedCategories.map(slug => (
        <button
          key={`cat-${slug}`}
          type="button"
          onClick={() => onRemoveCategory(slug)}
          className="filter-active-pill"
        >
          <span>{categoryLabel(slug)}</span>
          <span className="filter-active-pill-x" aria-hidden="true">
            <X size={12} />
          </span>
        </button>
      ))}
      {selectedConditions.map(value => (
        <button
          key={`cond-${value}`}
          type="button"
          onClick={() => onRemoveCondition(value)}
          className="filter-active-pill"
        >
          <span>{conditionLabel(value)}</span>
          <span className="filter-active-pill-x" aria-hidden="true">
            <X size={12} />
          </span>
        </button>
      ))}
      {selectedRegions.map(value => (
        <button
          key={`reg-${value}`}
          type="button"
          onClick={() => onRemoveRegion(value)}
          className="filter-active-pill"
        >
          <span>{regionLabel(value)}</span>
          <span className="filter-active-pill-x" aria-hidden="true">
            <X size={12} />
          </span>
        </button>
      ))}
      {filters.minPrice && filters.minPrice > 0 ? (
        <button
          type="button"
          onClick={() => onFilterChange({ minPrice: 0 })}
          className="filter-active-pill"
        >
          <span>{t('filters.priceFrom')}: {filters.minPrice}</span>
          <span className="filter-active-pill-x" aria-hidden="true">
            <X size={12} />
          </span>
        </button>
      ) : null}
      {filters.maxPrice ? (
        <button
          type="button"
          onClick={() => onFilterChange({ maxPrice: undefined })}
          className="filter-active-pill"
        >
          <span>{t('filters.priceTo')}: {filters.maxPrice}</span>
          <span className="filter-active-pill-x" aria-hidden="true">
            <X size={12} />
          </span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={onClearFilters}
        className="ms-1 text-xs font-semibold text-slate-500 underline-offset-2 transition-colors hover:text-primary-700 hover:underline"
      >
        {t('filters.clearAll')}
      </button>
    </div>
  );
}
