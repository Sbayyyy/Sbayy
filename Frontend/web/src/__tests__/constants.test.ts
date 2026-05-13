import {
  getCategoryLabelFromValue,
  getCityI18nKeyFromValue,
  getCityLabel,
  normalizeCityValue,
} from '@/lib/constants';

describe('localized constants', () => {
  describe('categories', () => {
    it('resolves canonical category slugs by locale', () => {
      expect(getCategoryLabelFromValue('electronics', 'en')).toBe('Electronics');
      expect(getCategoryLabelFromValue('electronics', 'ar')).toBe('إلكترونيات');
    });

    it('resolves legacy category paths from the database', () => {
      expect(getCategoryLabelFromValue('electronics/mobiles', 'en')).toBe('Electronics');
    });
  });

  describe('cities', () => {
    it('normalizes canonical and legacy city values', () => {
      expect(normalizeCityValue('damascus')).toBe('damascus');
      expect(normalizeCityValue('Damascus')).toBe('damascus');
      expect(normalizeCityValue('دمشق')).toBe('damascus');
    });

    it('resolves city labels by locale', () => {
      expect(getCityLabel('damascus', 'en')).toBe('Damascus');
      expect(getCityLabel('damascus', 'ar')).toBe('دمشق');
    });

    it('exposes translation keys for components using i18n', () => {
      expect(getCityI18nKeyFromValue('Damascus')).toBe('cities.damascus');
    });
  });
});
