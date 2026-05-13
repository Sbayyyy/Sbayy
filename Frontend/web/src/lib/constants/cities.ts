export interface CityOption {
  value: string;
  labelAr: string;
  i18nKey: string;
  i18nDefault: string;
}

/**
 * Syrian governorates / cities.
 * - `value`: slug used as the stored value (English, kebab-case)
 * - `labelAr`: Arabic display name
 * - `i18nKey` / `i18nDefault`: for pages that use `useTranslation`
 */
export const CITIES: CityOption[] = [
  { value: 'damascus', labelAr: 'دمشق', i18nKey: 'cities.damascus', i18nDefault: 'Damascus' },
  { value: 'rif-damascus', labelAr: 'ريف دمشق', i18nKey: 'cities.rifDamascus', i18nDefault: 'Rif Dimashq' },
  { value: 'aleppo', labelAr: 'حلب', i18nKey: 'cities.aleppo', i18nDefault: 'Aleppo' },
  { value: 'homs', labelAr: 'حمص', i18nKey: 'cities.homs', i18nDefault: 'Homs' },
  { value: 'hama', labelAr: 'حماة', i18nKey: 'cities.hama', i18nDefault: 'Hama' },
  { value: 'latakia', labelAr: 'اللاذقية', i18nKey: 'cities.latakia', i18nDefault: 'Latakia' },
  { value: 'tartus', labelAr: 'طرطوس', i18nKey: 'cities.tartus', i18nDefault: 'Tartus' },
  { value: 'idlib', labelAr: 'إدلب', i18nKey: 'cities.idlib', i18nDefault: 'Idlib' },
  { value: 'raqqa', labelAr: 'الرقة', i18nKey: 'cities.raqqa', i18nDefault: 'Raqqa' },
  { value: 'deir-ez-zor', labelAr: 'دير الزور', i18nKey: 'cities.deirEzZor', i18nDefault: 'Deir ez-Zor' },
  { value: 'al-hasakah', labelAr: 'الحسكة', i18nKey: 'cities.alHasakah', i18nDefault: 'Al-Hasakah' },
  { value: 'daraa', labelAr: 'درعا', i18nKey: 'cities.daraa', i18nDefault: 'Daraa' },
  { value: 'as-suwayda', labelAr: 'السويداء', i18nKey: 'cities.asSuwayda', i18nDefault: 'As-Suwayda' },
  { value: 'quneitra', labelAr: 'القنيطرة', i18nKey: 'cities.quneitra', i18nDefault: 'Quneitra' },
];

/** Arabic names used in AddressForm (checkout) city dropdown. */
export const CITY_NAMES_AR = CITIES.map(c => c.labelAr);

/**
 * Alias map: maps various representations of a city (English name, Arabic name,
 * slug) to the canonical slug value.
 */
const CITY_ALIAS_MAP = new Map<string, string>(
  CITIES.flatMap(c => [
    [c.value, c.value],
    [c.labelAr, c.value],
    [c.i18nDefault.toLowerCase(), c.value],
  ])
);

/** Try to decode mojibake (latin1-encoded UTF-8) back to proper UTF-8. */
export const fixMojibake = (value: string): string => {
  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return value;
  }
};

/** Normalize an arbitrary city string to its canonical slug. */
export const normalizeCityValue = (value?: string): string => {
  if (!value) return '';
  const fixed = fixMojibake(value).trim();
  const lower = fixed.toLowerCase();
  return CITY_ALIAS_MAP.get(lower) ?? CITY_ALIAS_MAP.get(fixed) ?? fixed;
};

/** Get the i18n key for a canonical or legacy city value. */
export const getCityI18nKeyFromValue = (value?: string): string | undefined => {
  if (!value) return undefined;
  const normalized = normalizeCityValue(value);
  const city = CITIES.find(c => c.value === normalized);
  return city?.i18nKey;
};

/** Get the display label for a city value. */
export const getCityLabel = (value?: string, locale?: string): string => {
  if (!value) return '';
  const normalized = normalizeCityValue(value);
  const city = CITIES.find(c => c.value === normalized);

  if (!city) {
    return fixMojibake(value);
  }

  return locale?.startsWith('ar') ? city.labelAr : city.i18nDefault;
};
