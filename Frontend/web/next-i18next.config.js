/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    locales: ['ar', 'en'],
    defaultLocale: 'ar',
  },
  fallbackLng: 'ar',
  defaultNS: 'common',
  react: { useSuspense: false },
};
