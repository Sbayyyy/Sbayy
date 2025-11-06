import { Product } from '@sbay/shared';
import { SellerStats, Order, DailyRevenue, WeeklySales } from '@sbay/shared';

export const mockProducts: Product[] = [
  {
    id: '1',
    title: 'iPhone 15 Pro Max جديد بالكرتونة',
    description: 'آيفون 15 برو ماكس جديد كلياً\n- 256GB\n- تيتانيوم أزرق\n- ضمان أبل',
    priceAmount: 85000000,
    priceCurrency: 'SYP',
    imageUrls: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
      'https://images.unsplash.com/photo-1695048133140-22b29f2b4b3b?w=800',
    ],
    categoryPath: 'إلكترونيات',
    condition: 'New',
    region: 'دمشق - المزة',
    seller: {
      id: 'seller-123',
      name: 'محمد أحمد',
      rating: 4.8
    },
    stock: 5,
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
    priceAmount: 65000000,
    priceCurrency: 'SYP',
    imageUrls: [
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
    ],
    categoryPath: 'إلكترونيات',
    condition: 'Used',
    region: 'حلب',
    seller: {
      id: 'seller-456',
      name: 'أحمد علي',
      rating: 4.5
    },
    stock: 1,
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
    priceAmount: 120000000,
    priceCurrency: 'SYP',
    imageUrls: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800'],
    categoryPath: 'إلكترونيات',
    condition: 'Used',
    region: 'دمشق',
    seller: {
      id: 'seller-789',
      name: 'خالد محمود'
    },
    stock: 0,
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
export const mockStats: SellerStats = {
  totalRevenue: 125700,
  totalOrders: 342,
  newCustomers: 89,
  conversionRate: 3.8,
  revenueChange: 8.5,
  ordersChange: 12.3,
  customersChange: 4.7,
  conversionChange: 3.2,
  activeProducts: 127,
  ordersCompleted: 284,
  awaitingShipment: 18
};

export const mockRecentOrders: Order[] = [
  {
    id: '1',
    orderId: 'ORD-1127',
    customerName: 'سارة أحمد',
    productName: 'سماعات لاسلكية برو',
    quantity: 1,
    amount: 2244900,
    status: 'Shipped',
    payment: 'Paid',
    date: 'Nov 8, 2025'
  },
  {
    id: '2',
    orderId: 'ORD-1246',
    customerName: 'محمد خالد',
    productName: 'ساعة ذكية سامسونج',
    quantity: 2,
    amount: 4449900,
    status: 'Processing',
    payment: 'Paid',
    date: 'Nov 5, 2025'
  },
  {
    id: '3',
    orderId: 'ORD-1245',
    customerName: 'فاطمة علي',
    productName: 'لابتوب ديل XPS',
    quantity: 1,
    amount: 10959900,
    status: 'Processing',
    payment: 'Paid',
    date: 'Nov 5, 2025'
  },
  {
    id: '4',
    orderId: 'ORD-1244',
    customerName: 'أحمد حسن',
    productName: 'كاميرا كانون EOS',
    quantity: 1,
    amount: 15599900,
    status: 'Delivered',
    payment: 'Paid',
    date: 'Nov 4, 2025'
  },
  {
    id: '5',
    orderId: 'ORD-1243',
    customerName: 'ليلى محمود',
    productName: 'آيفون 15 برو',
    quantity: 1,
    amount: 8799900,
    status: 'Pending',
    payment: 'Waiting',
    date: 'Nov 4, 2025'
  },
  {
    id: '6',
    orderId: 'ORD-1242',
    customerName: 'عمر يوسف',
    productName: 'تابلت سامسونج',
    quantity: 1,
    amount: 6799900,
    status: 'Pending',
    payment: 'Waiting',
    date: 'Nov 4, 2025'
  }
];

export const mockDailyRevenue: DailyRevenue[] = [
  { day: 'Mon', revenue: 4200 },
  { day: 'Tue', revenue: 5100 },
  { day: 'Wed', revenue: 4800 },
  { day: 'Thu', revenue: 6500 },
  { day: 'Fri', revenue: 6100 },
  { day: 'Sat', revenue: 3800 },
  { day: 'Sun', revenue: 3500 }
];

export const mockWeeklySales: WeeklySales[] = [
  { week: 'Week 1', sales: 18000 },
  { week: 'Week 2', sales: 23300 },
  { week: 'Week 3', sales: 19800 },
  { week: 'Week 4', sales: 24000 }
];