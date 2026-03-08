import type { ChangeEvent } from 'react';
import type { SearchFilters } from '@sbay/shared';

/**
 * Shared price filter utilities for browse/category pages.
 * Handles keyboard restriction (digits only) and value parsing.
 */
export function handlePriceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
  if (allowedKeys.includes(e.key)) return;
  if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
}

export function createPriceChangeHandler(
  onFilterChange: (update: Partial<SearchFilters>) => void
) {
  return (key: 'minPrice' | 'maxPrice') =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const cleaned = raw.replace(/[^0-9]/g, '');
      let value = cleaned === '' ? undefined : Number(cleaned);

      if (key === 'minPrice') {
        value = value !== undefined ? value : 0;
      } else if (value === 0) {
        value = undefined;
      }

      onFilterChange({ [key]: Number.isFinite(value) ? value : undefined });
    };
}
