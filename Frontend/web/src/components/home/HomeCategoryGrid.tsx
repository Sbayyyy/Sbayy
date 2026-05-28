import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { HOMEPAGE_CATEGORIES, getCategoryDescription, getCategoryName } from '@/lib/constants';
import { trackInteraction } from '@/lib/api/recommendations';

export default function HomeCategoryGrid() {
  const { t, i18n } = useTranslation('common');

  return (
    <div className="container mx-auto px-4">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">{t('home.categoriesHeading')}</h2>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">{t('home.categoriesSubtitle')}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {HOMEPAGE_CATEGORIES.map((category) => {
          const description = getCategoryDescription(category, i18n.language);
          return (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              onClick={() => void trackInteraction(category.slug, 'category_click')}
              className="category-card group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
            >
              <span className="category-card-icon flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-2xl transition-colors group-hover:bg-primary-50">
                {category.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-950 group-hover:text-primary-700">
                  {getCategoryName(category, i18n.language)}
                </span>
                {description && (
                  <span className="mt-0.5 block truncate text-xs leading-5 text-slate-500">
                    {description}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
