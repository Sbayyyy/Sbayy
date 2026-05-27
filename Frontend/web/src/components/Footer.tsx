import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { Facebook, Instagram, Twitter, Mail } from 'lucide-react';
import { config } from '@/lib/config';
import LanguageToggle from './LanguageToggle';

export default function Footer() {
  const { t } = useTranslation('common');
  const supportEmail = config.supportEmail;

  const columnHeadingClass = 'mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500';
  const columnLinkClass = 'text-sm text-slate-600 transition-colors hover:text-primary-700';

  return (
    <footer className="footer-surface mt-16 border-t border-slate-200/60">
      <div className="container mx-auto px-4 pb-10 pt-14 sm:pt-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <img
                src={config.logoUrl}
                alt=""
                className="h-9 w-9 rounded-xl object-contain"
                loading="lazy"
              />
              <span className="text-xl font-extrabold tracking-tight text-slate-950">
                {t('footer.brandName')}
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
              {t('footer.about')}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                aria-label="Facebook"
                aria-disabled="true"
                className="footer-social"
                onClick={e => e.preventDefault()}
              >
                <Facebook size={16} />
              </button>
              <button
                type="button"
                aria-label="Instagram"
                aria-disabled="true"
                className="footer-social"
                onClick={e => e.preventDefault()}
              >
                <Instagram size={16} />
              </button>
              <button
                type="button"
                aria-label="Twitter"
                aria-disabled="true"
                className="footer-social"
                onClick={e => e.preventDefault()}
              >
                <Twitter size={16} />
              </button>
              <a href={`mailto:${supportEmail}`} aria-label="Email" className="footer-social">
                <Mail size={16} />
              </a>
            </div>
          </div>

          <div className="md:col-span-3">
            <h5 className={columnHeadingClass}>{t('footer.quickLinks')}</h5>
            <ul className="space-y-2.5">
              <li><Link href="/about" className={columnLinkClass}>{t('footer.aboutSbay')}</Link></li>
              <li><Link href="/how-it-works" className={columnLinkClass}>{t('footer.howItWorks')}</Link></li>
              <li><Link href="/help" className={columnLinkClass}>{t('footer.helpCenter')}</Link></li>
              <li><Link href="/buyer-protection" className={columnLinkClass}>{t('footer.buyerProtection')}</Link></li>
              <li><Link href="/contact" className={columnLinkClass}>{t('footer.contactUs')}</Link></li>
              <li><Link href="/privacy-policy" className={columnLinkClass}>{t('footer.privacyPolicy')}</Link></li>
              <li><Link href="/terms" className={columnLinkClass}>{t('footer.termsAndConditions')}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h5 className={columnHeadingClass}>{t('footer.forSellers')}</h5>
            <ul className="space-y-2.5">
              <li><Link href="/listing/sell" className={columnLinkClass}>{t('footer.startSelling')}</Link></li>
              <li><Link href="/seller-guide" className={columnLinkClass}>{t('footer.sellerGuide')}</Link></li>
              <li><Link href="/fees" className={columnLinkClass}>{t('footer.feesAndCommissions')}</Link></li>
              <li><Link href="/seller-protection" className={columnLinkClass}>{t('footer.sellerProtection')}</Link></li>
              <li><Link href="/seller-tips" className={columnLinkClass}>{t('footer.sellingTips')}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h5 className={columnHeadingClass}>{t('footer.contactHeading')}</h5>
            <ul className="space-y-2.5">
              <li>
                <a href={`mailto:${supportEmail}`} className={`${columnLinkClass} inline-flex items-center gap-2`}>
                  <Mail size={14} className="text-slate-400" />
                  <span className="truncate">{supportEmail}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-slate-200/60 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center gap-5">
              <Link href="/privacy-policy" className="hover:text-primary-700">{t('footer.privacy')}</Link>
              <Link href="/terms" className="hover:text-primary-700">{t('footer.terms')}</Link>
              <Link href="/sitemap.xml" className="hover:text-primary-700">{t('footer.sitemap')}</Link>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
