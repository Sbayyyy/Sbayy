import { useTranslation } from 'next-i18next';
import { FILTER_CATEGORIES, getCategoryName } from '@/lib/constants';

interface CategoryScrollerProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
}

export default function CategoryScroller({ selectedCategories, onCategoryChange }: CategoryScrollerProps) {
  const { t, i18n } = useTranslation('common');

  return (
    <section className="container mx-auto px-4 pt-6">
      <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0">
        <button
          type="button"
          onClick={() => onCategoryChange([])}
          className={`hero-chip ${selectedCategories.length === 0 ? 'hero-chip-active' : ''}`}
        >
          <span className="truncate">{t('filters.allCategories')}</span>
        </button>
        {FILTER_CATEGORIES.map(category => {
          const active = selectedCategories.includes(category.slug);
          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => {
                const next = active
                  ? selectedCategories.filter(value => value !== category.slug)
                  : [...selectedCategories, category.slug];
                onCategoryChange(next);
              }}
              className={`hero-chip ${active ? 'hero-chip-active' : ''}`}
            >
              <span className="hero-chip-icon" aria-hidden="true">{category.icon}</span>
              <span className="truncate">{getCategoryName(category, i18n.language)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
