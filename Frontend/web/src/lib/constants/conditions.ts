export interface ConditionOption {
  value: string;
  labelAr: string;
  i18nKey: string;
}

/**
 * Product condition options with PascalCase values matching the backend.
 * Single source of truth for condition labels.
 */
export const CONDITIONS: ConditionOption[] = [
  { value: 'New', labelAr: 'جديد', i18nKey: 'listing.conditions.new' },
  { value: 'Used', labelAr: 'مستعمل', i18nKey: 'listing.conditions.used' },
  { value: 'Refurbished', labelAr: 'مجدد', i18nKey: 'listing.conditions.refurbished' },
  { value: 'LikeNew', labelAr: 'كالجديد', i18nKey: 'listing.conditions.likeNew' },
  { value: 'Good', labelAr: 'جيد', i18nKey: 'listing.conditions.good' },
  { value: 'Fair', labelAr: 'مقبول', i18nKey: 'listing.conditions.fair' },
  { value: 'Poor', labelAr: 'سيئ', i18nKey: 'listing.conditions.poor' },
];

/** Conditions shown in filter sidebars (subset without Good/Fair/Poor). */
export const FILTER_CONDITIONS: ConditionOption[] = CONDITIONS.filter(c =>
  ['New', 'Used', 'Refurbished', 'LikeNew'].includes(c.value)
);

/** Map from PascalCase condition value to Arabic label. */
export const CONDITION_LABEL_MAP: Record<string, string> = Object.fromEntries(
  CONDITIONS.map(c => [c.value, c.labelAr])
);

/** Map from PascalCase condition value to i18n key (for pages using useTranslation). */
export const CONDITION_I18N_MAP: Record<string, string> = Object.fromEntries(
  CONDITIONS.map(c => [c.value, c.i18nKey])
);
