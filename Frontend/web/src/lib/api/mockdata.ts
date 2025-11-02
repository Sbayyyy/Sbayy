import { Product } from '@sbay/shared';

export const mockProducts: Product[] = [
  {
    id: '1',
    title: 'iPhone 15 Pro Max جديد بالكرتونة',
    description: 'آيفون 15 برو ماكس جديد كلياً\n- 256GB\n- تيتانيوم أزرق\n- ضمان أبل',
    price: 85000000,
    currency: 'SYP',
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
      'https://images.unsplash.com/photo-1695048133140-22b29f2b4b3b?w=800',
    ],
    category: 'إلكترونيات',
    condition: 'new',
    location: 'دمشق - المزة',
    seller: {
      id: 'seller-123',
      name: 'محمد أحمد',
      rating: 4.8
    },
    stockQuantity: 5,
    status: 'active',
    views: 234,
    favorites: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'سامسونج Galaxy S24 Ultra',
    description: 'جالكسي S24 ألترا مستعمل بحالة ممتازة',
    price: 65000000,
    currency: 'SYP',
    images: [
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
    ],
    category: 'إلكترونيات',
    condition: 'used',
    location: 'حلب',
    seller: {
      id: 'seller-456',
      name: 'أحمد علي',
      rating: 4.5
    },
    stockQuantity: 1,
    status: 'active',
    views: 156,
    favorites: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'لابتوب Dell XPS 15 - غير متوفر',
    description: 'لابتوب ديل XPS تم بيعه',
    price: 120000000,
    currency: 'SYP',
    images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800'],
    category: 'إلكترونيات',
    condition: 'used',
    location: 'دمشق',
    seller: {
      id: 'seller-789',
      name: 'خالد محمود'
    },
    stockQuantity: 0, // Out of stock!
    status: 'sold',
    views: 89,
    favorites: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const getMockProductById = (id: string): Product | undefined => {
  return mockProducts.find(p => p.id === id);
};