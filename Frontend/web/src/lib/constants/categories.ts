export interface CategoryDefinition {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  icon: string;
  description?: string;
}

/**
 * Canonical category definitions used across the application.
 * Single source of truth for category slugs, names (Arabic/English), icons.
 */
export const CATEGORIES: CategoryDefinition[] = [
  { id: 'cars', slug: 'cars', name: 'مركبات', nameEn: 'Vehicles', icon: '🚗', description: 'سيارات، دراجات، قطع غيار' },
  { id: 'electronics', slug: 'electronics', name: 'إلكترونيات', nameEn: 'Electronics', icon: '📱', description: 'هواتف، أجهزة كمبيوتر، أجهزة منزلية إلكترونية' },
  { id: 'furniture', slug: 'furniture', name: 'أثاث', nameEn: 'Furniture', icon: '🛋️' },
  { id: 'home', slug: 'home', name: 'منزل وحديقة', nameEn: 'Home & Garden', icon: '🏡', description: 'أثاث، ديكور، أدوات منزلية' },
  { id: 'fashion', slug: 'fashion', name: 'أزياء', nameEn: 'Fashion', icon: '👕', description: 'ملابس، أحذية، إكسسوارات' },
  { id: 'books', slug: 'books', name: 'كتب', nameEn: 'Books', icon: '📚' },
  { id: 'sports', slug: 'sports', name: 'رياضة', nameEn: 'Sports', icon: '⚽' },
  { id: 'real-estate', slug: 'real-estate', name: 'عقارات', nameEn: 'Real Estate', icon: '🏢', description: 'شقق، منازل، مكاتب للبيع أو الإيجار' },
  { id: 'other', slug: 'other', name: 'أخرى', nameEn: 'Other', icon: '📦', description: 'منتجات متنوعة' },
];

/** Categories shown on the homepage grid. */
export const HOMEPAGE_CATEGORIES = CATEGORIES.filter(c =>
  ['cars', 'electronics', 'furniture', 'home', 'fashion', 'books', 'sports', 'other'].includes(c.id)
);

/** Categories used in filter sidebars and sell form. */
export const FILTER_CATEGORIES = CATEGORIES.filter(c =>
  ['electronics', 'fashion', 'home', 'cars', 'real-estate'].includes(c.id)
);

/** Categories for the sell form (includes 'other'). */
export const SELL_CATEGORIES = CATEGORIES.filter(c =>
  ['electronics', 'fashion', 'home', 'cars', 'real-estate', 'other'].includes(c.id)
);

/** Map from slug to category definition for quick lookups. */
export const CATEGORY_MAP = new Map(CATEGORIES.map(c => [c.slug, c]));
