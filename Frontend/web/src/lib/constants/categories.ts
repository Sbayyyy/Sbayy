export interface CategoryDefinition {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  icon: string;
  description?: string;
  descriptionEn?: string;
}

export const CATEGORIES: CategoryDefinition[] = [
  { id: 'cars', slug: 'cars', name: 'مركبات', nameEn: 'Vehicles', icon: '🚗', description: 'سيارات، دراجات، قطع غيار', descriptionEn: 'Cars, motorcycles, spare parts' },
  { id: 'electronics', slug: 'electronics', name: 'إلكترونيات', nameEn: 'Electronics', icon: '📱', description: 'هواتف، أجهزة كمبيوتر، أجهزة منزلية إلكترونية', descriptionEn: 'Phones, computers, home electronics' },
  { id: 'furniture', slug: 'furniture', name: 'أثاث', nameEn: 'Furniture', icon: '🛋️', descriptionEn: 'Furniture and home pieces' },
  { id: 'home', slug: 'home', name: 'منزل وحديقة', nameEn: 'Home & Garden', icon: '🏡', description: 'أثاث، ديكور، أدوات منزلية', descriptionEn: 'Furniture, decor, household items' },
  { id: 'fashion', slug: 'fashion', name: 'أزياء', nameEn: 'Fashion', icon: '👕', description: 'ملابس، أحذية، إكسسوارات', descriptionEn: 'Clothing, shoes, accessories' },
  { id: 'books', slug: 'books', name: 'كتب', nameEn: 'Books', icon: '📚' },
  { id: 'sports', slug: 'sports', name: 'رياضة', nameEn: 'Sports', icon: '⚽' },
  { id: 'real-estate', slug: 'real-estate', name: 'عقارات', nameEn: 'Real Estate', icon: '🏢', description: 'شقق، منازل، مكاتب للبيع أو الإيجار', descriptionEn: 'Apartments, homes, offices for sale or rent' },
  { id: 'other', slug: 'other', name: 'أخرى', nameEn: 'Other', icon: '📦', description: 'منتجات متنوعة', descriptionEn: 'Various products' },
];

export const HOMEPAGE_CATEGORIES = CATEGORIES.filter(c =>
  ['cars', 'electronics', 'furniture', 'home', 'fashion', 'books', 'sports', 'other'].includes(c.id)
);

export const FILTER_CATEGORIES = CATEGORIES.filter(c =>
  ['electronics', 'fashion', 'home', 'cars', 'real-estate'].includes(c.id)
);

export const SELL_CATEGORIES = CATEGORIES.filter(c =>
  ['electronics', 'fashion', 'home', 'cars', 'real-estate', 'other'].includes(c.id)
);

export const CATEGORY_MAP = new Map(CATEGORIES.map(c => [c.slug, c]));

export const getCategoryName = (category: CategoryDefinition, locale?: string) =>
  locale?.startsWith('ar') ? category.name : category.nameEn;

export const getCategoryDescription = (category: CategoryDefinition, locale?: string) =>
  locale?.startsWith('ar') ? category.description : category.descriptionEn || category.description;

export const getCategoryLabelFromValue = (value?: string, locale?: string) => {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  const category = CATEGORIES.find(c =>
    c.slug.toLowerCase() === normalized ||
    c.id.toLowerCase() === normalized ||
    c.name.toLowerCase() === normalized ||
    c.nameEn.toLowerCase() === normalized
  );

  return category ? getCategoryName(category, locale) : value;
};
