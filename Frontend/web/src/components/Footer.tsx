import Link from 'next/link';
import { Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h4 className="text-xl font-bold mb-4">سباي</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              منصة التجارة الإلكترونية الرائدة في سوريا. اشترِ وبع بسهولة وأمان.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="p-2 bg-gray-800 hover:bg-primary-600 rounded-lg transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="p-2 bg-gray-800 hover:bg-primary-600 rounded-lg transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="p-2 bg-gray-800 hover:bg-primary-600 rounded-lg transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="font-semibold mb-4">روابط سريعة</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  عن سباي
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">
                  كيف يعمل الموقع
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-gray-400 hover:text-white transition-colors">
                  مركز المساعدة
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                  اتصل بنا
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  سياسة الخصوصية
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  الشروط والأحكام
                </Link>
              </li>
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h5 className="font-semibold mb-4">للبائعين</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/listing/sell" className="text-gray-400 hover:text-white transition-colors">
                  ابدأ البيع الآن
                </Link>
              </li>
              <li>
                <Link href="/seller-guide" className="text-gray-400 hover:text-white transition-colors">
                  دليل البائع
                </Link>
              </li>
              <li>
                <Link href="/fees" className="text-gray-400 hover:text-white transition-colors">
                  الرسوم والعمولات
                </Link>
              </li>
              <li>
                <Link href="/seller-protection" className="text-gray-400 hover:text-white transition-colors">
                  حماية البائع
                </Link>
              </li>
              <li>
                <Link href="/seller-tips" className="text-gray-400 hover:text-white transition-colors">
                  نصائح للبيع
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="font-semibold mb-4">تواصل معنا</h5>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-gray-400">
                <Mail size={16} />
                <a href="mailto:support@sbay.sy" className="hover:text-white transition-colors">
                  support@sbay.sy
                </a>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Phone size={16} />
                <a href="tel:+963123456789" className="hover:text-white transition-colors">
                  +963 12 345 6789
                </a>
              </li>
              <li className="text-gray-400 mt-4">
                <p className="font-medium text-white mb-1">ساعات العمل:</p>
                <p>السبت - الخميس: 9:00 ص - 6:00 م</p>
                <p>الجمعة: مغلق</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm text-center md:text-right">
            &copy; 2025 سباي. جميع الحقوق محفوظة.
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
              الخصوصية
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
              الشروط
            </Link>
            <Link href="/sitemap" className="text-gray-400 hover:text-white transition-colors">
              خريطة الموقع
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}