import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Check, ChevronDown, MapPin } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { CITIES, getCityI18nKeyFromValue, getCityLabel } from '@/lib/constants';

interface RegionSelectorProps {
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  onOpenChange?: (open: boolean) => void;
}

export default function RegionSelector({ selectedRegion, onRegionChange, onOpenChange }: RegionSelectorProps) {
  const { t, i18n } = useTranslation('common');
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);
  const regionMenuRef = useRef<HTMLDivElement>(null);
  const regionTriggerRef = useRef<HTMLButtonElement>(null);
  const regionListboxRef = useRef<HTMLDivElement>(null);
  const regionTypeaheadRef = useRef({ query: '', timestamp: 0 });

  const regionOptions = useMemo(() => [
    { value: '', label: t('home.allRegions', 'All regions') },
    ...CITIES.map(city => ({
      value: city.value,
      label: t(city.i18nKey, city.i18nDefault),
    })),
  ], [t]);

  const selectedRegionI18nKey = getCityI18nKeyFromValue(selectedRegion);
  const selectedRegionLabel = selectedRegion
    ? selectedRegionI18nKey
      ? t(selectedRegionI18nKey, getCityLabel(selectedRegion, i18n.language))
      : getCityLabel(selectedRegion, i18n.language)
    : '';
  const activeRegionOptionId = `home-region-option-${regionOptions[activeRegionIndex]?.value || 'all'}`;

  useEffect(() => {
    onOpenChange?.(regionMenuOpen);
  }, [onOpenChange, regionMenuOpen]);

  useEffect(() => {
    if (!regionMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!regionMenuRef.current?.contains(event.target as Node)) {
        setRegionMenuOpen(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRegionMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [regionMenuOpen]);

  useEffect(() => {
    if (!regionMenuOpen) return;
    regionListboxRef.current?.focus();
  }, [regionMenuOpen]);

  useEffect(() => {
    if (!regionMenuOpen) return;
    document.getElementById(activeRegionOptionId)?.scrollIntoView({ block: 'nearest' });
  }, [activeRegionOptionId, regionMenuOpen]);

  const openRegionMenu = () => {
    const selectedIndex = regionOptions.findIndex(option => option.value === selectedRegion);
    setActiveRegionIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setRegionMenuOpen(true);
  };

  const closeRegionMenu = (restoreFocus = false) => {
    setRegionMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => regionTriggerRef.current?.focus());
    }
  };

  const selectRegionOption = (index: number) => {
    const option = regionOptions[index];
    if (!option) return;
    onRegionChange(option.value);
    closeRegionMenu(true);
  };

  const handleRegionListboxKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveRegionIndex(index => Math.min(index + 1, regionOptions.length - 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        setActiveRegionIndex(index => Math.max(index - 1, 0));
        return;
      case 'Home':
        event.preventDefault();
        setActiveRegionIndex(0);
        return;
      case 'End':
        event.preventDefault();
        setActiveRegionIndex(regionOptions.length - 1);
        return;
      case 'Enter':
        event.preventDefault();
        selectRegionOption(activeRegionIndex);
        return;
      case 'Escape':
        event.preventDefault();
        closeRegionMenu(true);
        return;
      default:
        break;
    }

    if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) return;

    const now = Date.now();
    const nextQuery =
      now - regionTypeaheadRef.current.timestamp > 500
        ? event.key
        : regionTypeaheadRef.current.query + event.key;

    regionTypeaheadRef.current = { query: nextQuery, timestamp: now };
    const normalizedQuery = nextQuery.toLocaleLowerCase(i18n.language);
    const nextIndex = regionOptions.findIndex(option =>
      option.label.toLocaleLowerCase(i18n.language).startsWith(normalizedQuery)
    );

    if (nextIndex >= 0) {
      setActiveRegionIndex(nextIndex);
    }
  };

  const handleRegionTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openRegionMenu();
    }
  };

  return (
    <div
      ref={regionMenuRef}
      className={`relative flex items-center sm:w-56 ${regionMenuOpen ? 'z-[60]' : 'z-0'}`}
    >
      <button
        ref={regionTriggerRef}
        type="button"
        onClick={() => (regionMenuOpen ? closeRegionMenu() : openRegionMenu())}
        onKeyDown={handleRegionTriggerKeyDown}
        className="hero-command-region flex w-full items-center gap-2 text-start"
        aria-expanded={regionMenuOpen}
        aria-haspopup="listbox"
        aria-controls="home-region-listbox"
        aria-label={t('home.regionSelect', 'Select region')}
      >
        <MapPin className="h-4 w-4 flex-shrink-0 text-primary-600" aria-hidden="true" />
        <span className="flex-1 truncate text-sm font-medium text-slate-800">
          {selectedRegionLabel || t('home.allRegions', 'All regions')}
        </span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${regionMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {regionMenuOpen && (
        <div
          id="home-region-listbox"
          ref={regionListboxRef}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={activeRegionOptionId}
          onKeyDown={handleRegionListboxKeyDown}
          className="hero-region-listbox"
        >
          {regionOptions.map((option, index) => {
            const selected = selectedRegion === option.value;
            const active = activeRegionIndex === index;

            return (
              <div
                key={option.value || 'all'}
                id={`home-region-option-${option.value || 'all'}`}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setActiveRegionIndex(index);
                  selectRegionOption(index);
                }}
                onMouseEnter={() => setActiveRegionIndex(index)}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-primary-50 text-primary-700'
                    : active
                      ? 'bg-slate-100 text-slate-950'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {selected && <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
