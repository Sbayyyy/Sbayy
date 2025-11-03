import { useState, useEffect } from 'react';
import { getAllListings } from '@/lib/api/listings';
import { Product } from '@sbay/shared';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { mockProducts } from '@/lib/api/mockdata';


export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      // for testing with mock data
      
      // await new Promise(res => setTimeout(res, 1000)); // Simuliere Ladezeit
      // setFeaturedProducts(mockProducts.slice(0, 8)); // Verwende Mock-Daten
      // return;



      const data = await getAllListings(1, 8); // Nur erste 8 Produkte
      if (data && data.items) {
        setFeaturedProducts(data.items);
      } else if (Array.isArray(data)) {
        setFeaturedProducts(data.slice(0, 8));
      }
    } catch (err) {
      console.error('Error loading featured products:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="الرئيسية - سباي">
      
      <div className="min-h-screen">
        

        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">مرحباً بك في سباي</h2>
            <p className="text-xl md:text-2xl mb-8">
              سوق سوريا الإلكتروني - اشترِ وبع بسهولة وأمان
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/browse" className="btn bg-white text-primary-600 hover:bg-gray-100">
                تصفح المنتجات
              </Link>
              <Link href="/sell" className="btn bg-primary-700 hover:bg-primary-800">
                ابدأ البيع
              </Link>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h3 className="text-3xl font-bold mb-8 text-center">تصفح حسب الفئة</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.id}`}
                  className="card hover:shadow-lg transition-shadow text-center"
                >
                  <div className="text-4xl mb-3">{cat.icon}</div>
                  <h4 className="font-semibold">{cat.name}</h4>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-bold">منتجات مميزة</h3>
              <Link href="/browse" className="text-primary-600 hover:underline">
                عرض الكل ←
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                لا توجد منتجات متوفرة حالياً
              </div>
            )}
          </div>
        </section>

        
      </div>
    </Layout>
  );
}

const categories = [
  { id: '1', name: 'إلكترونيات', icon: '📱' },
  { id: '2', name: 'أزياء', icon: '👔' },
  { id: '3', name: 'منزل وحديقة', icon: '🏠' },
  { id: '4', name: 'سيارات', icon: '🚗' },
  { id: '5', name: 'عقارات', icon: '🏢' },
  { id: '6', name: 'شيء آخر', icon: '🏢' }
];
