import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { Facebook, Instagram, Twitter, Mail } from 'lucide-react';
import { config } from '@/lib/config';

export default function Footer() {
  const { t, i18n } = useTranslation('common');
  const currentLocale = i18n?.language ?? 'en';
  const supportEmail = config.supportEmail;
  const setLocaleCookie = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
  };

  const ensureLocaleLoaded = async (locale: string) => {
    const canCheck = typeof i18n?.hasResourceBundle === 'function';
    if (!i18n) return;
    if (canCheck && i18n.hasResourceBundle(locale, 'common')) return;
    if (typeof i18n.addResourceBundle !== 'function') return;
    const response = await fetch(`/locales/${locale}/common.json`);
    if (!response.ok) return;
    const resources = await response.json();
    i18n.addResourceBundle(locale, 'common', resources, true, true);
  };

  const handleLocaleChange = async (locale: string) => {
    if (typeof window === 'undefined') return;
    setLocaleCookie(locale);
    await ensureLocaleLoaded(locale);
    i18n?.changeLanguage?.(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h4 className="text-xl font-bold mb-4">{t('footer.brandName')}</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t('footer.about')}
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
            <h5 className="font-semibold mb-4">{t('footer.quickLinks')}</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.aboutSbay')}
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.howItWorks')}
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.helpCenter')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.contactUs')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.termsAndConditions')}
                </Link>
              </li>
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h5 className="font-semibold mb-4">{t('footer.forSellers')}</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/listing/sell" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.startSelling')}
                </Link>
              </li>
              <li>
                <Link href="/seller-guide" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.sellerGuide')}
                </Link>
              </li>
              <li>
                <Link href="/fees" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.feesAndCommissions')}
                </Link>
              </li>
              <li>
                <Link href="/seller-protection" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.sellerProtection')}
                </Link>
              </li>
              <li>
                <Link href="/seller-tips" className="text-gray-400 hover:text-white transition-colors">
                  {t('footer.sellingTips')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="font-semibold mb-4">{t('footer.contactHeading')}</h5>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-gray-400">
                <Mail size={16} />
                <a href={`mailto:${supportEmail}`} className="hover:text-white transition-colors">
                  {supportEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm text-center md:text-right">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm">
            <div className="flex gap-6">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.privacy')}
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.terms')}
              </Link>
              <Link href="/sitemap" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.sitemap')}
              </Link>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <button
                type="button"
                onClick={() => handleLocaleChange('en')}
                className={currentLocale === 'en' ? 'text-white' : 'hover:text-white transition-colors'}
              >
                EN
              </button>
              <span className="text-gray-500">|</span>
              <button
                type="button"
                onClick={() => handleLocaleChange('ar')}
                className={currentLocale === 'ar' ? 'text-white' : 'hover:text-white transition-colors'}
              >
                AR
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
