import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Search, ShoppingCart, User, Menu, X, Heart, Package } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useCartStore } from '@/lib/cartStore';

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/');
  };

  // Mock: Cart item count (später aus Cart Store)
  const { itemCount, openCart } = useCartStore();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Main Header */}
        <div className="flex items-center justify-between py-4">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold text-primary-600 hover:text-primary-700">
              سباي
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-6">
              <Link href="/" className="text-gray-700 hover:text-primary-600 transition-colors">
                الرئيسية
              </Link>
              <Link href="/browse" className="text-gray-700 hover:text-primary-600 transition-colors">
                تصفح المنتجات
              </Link>
              
            </nav>
          </div>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8 hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتجات..."
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Sell Button */}
            <Link
              href="/listing/sell"
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <Package size={18} />
              بيع الآن
            </Link>

            {/* Favorites */}
            <Link
              href="/favorites"
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="المفضلة"
            >
              <Heart size={24} />
            </Link>

            {/* Shopping Cart */}
            <button
              onClick={openCart}
              className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="السلة"
            >
              <ShoppingCart size={24} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {itemCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden lg:block text-sm font-medium">{user.name}</span>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-20">
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        لوحة التحكم
                      </Link>
                      <Link
                        href="/dashboard/listings"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        إعلاناتي
                      </Link>
                      <Link
                        href="/dashboard/orders"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        طلباتي
                      </Link>
                      <Link
                        href="/messages"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        الرسائل
                      </Link>
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-right px-4 py-2 text-red-600 hover:bg-gray-100"
                      >
                        تسجيل الخروج
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="hidden md:flex items-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <User size={18} />
                تسجيل الدخول
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden pb-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منتجات..."
              className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2">
              <Search size={20} className="text-gray-400" />
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <nav className="container mx-auto px-4 py-4 space-y-2">
            <Link
              href="/"
              className="block py-2 text-gray-700 hover:text-primary-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              الرئيسية
            </Link>
            <Link
              href="/browse"
              className="block py-2 text-gray-700 hover:text-primary-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              تصفح المنتجات
            </Link>
            <Link
              href="/categories"
              className="block py-2 text-gray-700 hover:text-primary-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              الفئات
            </Link>
            <Link
              href="/listing/sell"
              className="block py-2 text-primary-600 font-semibold"
              onClick={() => setMobileMenuOpen(false)}
            >
              بيع الآن
            </Link>
            {!isAuthenticated && (
              <>
                <hr className="my-2" />
                <Link
                  href="/auth/login"
                  className="block py-2 text-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  تسجيل الدخول
                </Link>
                <Link
                  href="/auth/register"
                  className="block py-2 text-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  إنشاء حساب
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}