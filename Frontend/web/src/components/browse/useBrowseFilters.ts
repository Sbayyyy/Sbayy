import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { ListingCondition, SearchFilters } from '@sbay/shared';

export const createDefaultBrowseFilters = (): SearchFilters => ({
  categories: [],
  minPrice: 0,
  maxPrice: undefined,
  conditions: [],
  regions: [],
  sortBy: 'date',
  sortOrder: 'desc',
});

export const normalizeBrowseFilters = (filters: SearchFilters): SearchFilters => ({
  ...filters,
  minPrice:
    filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice
      ? undefined
      : filters.minPrice,
  maxPrice:
    filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice
      ? undefined
      : filters.maxPrice === 0
        ? undefined
        : filters.maxPrice,
});

export function useBrowseFilters() {
  const { t } = useTranslation('common');
  const [filters, setFilters] = useState<SearchFilters>(createDefaultBrowseFilters);
  const [priceError, setPriceError] = useState('');

  useEffect(() => {
    if (
      filters.minPrice !== undefined &&
      filters.maxPrice !== undefined &&
      filters.minPrice > 0 &&
      filters.maxPrice > 0 &&
      filters.minPrice > filters.maxPrice
    ) {
      setPriceError(t('filters.priceError'));
    } else {
      setPriceError('');
    }
  }, [filters.minPrice, filters.maxPrice, t]);

  const handleFilterChange = (update: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...update }));
  };

  const clearFilters = () => {
    setFilters(createDefaultBrowseFilters());
  };

  const removeCategory = (slug: string) =>
    setFilters(prev => ({ ...prev, categories: (prev.categories ?? []).filter(category => category !== slug) }));

  const removeCondition = (value: ListingCondition) =>
    setFilters(prev => ({ ...prev, conditions: (prev.conditions ?? []).filter(condition => condition !== value) }));

  const removeRegion = (value: string) =>
    setFilters(prev => ({ ...prev, regions: (prev.regions ?? []).filter(region => region !== value) }));

  const selectedCategories = filters.categories ?? [];
  const selectedConditions = filters.conditions ?? [];
  const selectedRegions = filters.regions ?? [];
  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedConditions.length > 0 ||
    selectedRegions.length > 0 ||
    Boolean((filters.minPrice && filters.minPrice > 0) || filters.maxPrice);

  return {
    filters,
    setFilters,
    priceError,
    selectedCategories,
    selectedConditions,
    selectedRegions,
    hasActiveFilters,
    handleFilterChange,
    clearFilters,
    removeCategory,
    removeCondition,
    removeRegion,
  };
}
