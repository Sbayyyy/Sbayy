import Head from 'next/head';
import Link from 'next/link';
import { Search, ShoppingCart, User, Menu } from 'lucide-react';

export default function Home() {
  return (
    <>
      <Head>
        <title>سباي - سوق سوريا الإلكتروني</title>
        <meta name="description" content="منصة تجارة إلكترونية مثل eBay مصممة خصيصاً لسوريا" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <h1 className="text-2xl font-bold text-primary-600">سباي</h1>
                <nav className="hidden md:flex gap-6">
                  <Link href="/" className="hover:text-primary-600">
                    الرئيسية
                  </Link>
                  <Link href="/categories" className="hover:text-primary-600">
                    الفئات
                  </Link>
                  <Link href="/sell" className="hover:text-primary-600">
                    بيع الآن
                  </Link>
                </nav>
              </div>

              <div className="flex-1 max-w-2xl mx-8 hidden md:block">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث عن منتجات..."
                    className="w-full input pr-12"
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <ShoppingCart size={24} />
                </button>
                <Link href="/login" className="btn btn-primary">
                  <User size={20} className="inline ml-2" />
                  تسجيل الدخول
                </Link>
                <button className="md:hidden p-2">
                  <Menu size={24} />
                </button>
              </div>
            </div>
          </div>
        </header>

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
            <h3 className="text-3xl font-bold mb-8">منتجات مميزة</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card hover:shadow-lg transition-shadow">
                  <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                  <h4 className="font-semibold mb-2">منتج تجريبي {i}</h4>
                  <p className="text-gray-600 text-sm mb-3">وصف قصير للمنتج</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-primary-600">١٠٠٫٠٠٠ ل.س</span>
                    <button className="btn btn-primary text-sm">عرض</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h4 className="text-xl font-bold mb-4">سباي</h4>
                <p className="text-gray-400">
                  منصة التجارة الإلكترونية الرائدة في سوريا
                </p>
              </div>
              <div>
                <h5 className="font-semibold mb-4">روابط سريعة</h5>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/about">عن سباي</Link></li>
                  <li><Link href="/help">المساعدة</Link></li>
                  <li><Link href="/contact">اتصل بنا</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-4">للبائعين</h5>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/sell">ابدأ البيع</Link></li>
                  <li><Link href="/seller-guide">دليل البائع</Link></li>
                  <li><Link href="/fees">الرسوم</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-4">تابعنا</h5>
                <div className="flex gap-4 text-gray-400">
                  <a href="#" className="hover:text-white">Facebook</a>
                  <a href="#" className="hover:text-white">Instagram</a>
                  <a href="#" className="hover:text-white">Twitter</a>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2025 سباي. جميع الحقوق محفوظة.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

const categories = [
  { id: '1', name: 'إلكترونيات', icon: '📱' },
  { id: '2', name: 'أزياء', icon: '👔' },
  { id: '3', name: 'منزل وحديقة', icon: '🏠' },
  { id: '4', name: 'سيارات', icon: '🚗' },
  { id: '5', name: 'عقارات', icon: '🏢' },
];
