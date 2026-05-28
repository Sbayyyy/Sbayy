interface FilterTabOption<T extends string> {
  value: T;
  label: string;
}

interface FilterTabsProps<T extends string> {
  options: ReadonlyArray<FilterTabOption<T>>;
  value: T;
  onChange: (next: T) => void;
  className?: string;
  /** Stretch tabs to fill width on mobile. Default: false (compact). */
  fullWidth?: boolean;
}

export default function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  className,
  fullWidth = false,
}: FilterTabsProps<T>) {
  const widthClass = fullWidth ? 'w-full sm:w-fit overflow-x-auto' : 'w-fit';
  return (
    <div role="tablist" className={`flex gap-2 rounded-2xl bg-slate-100 p-1 ${widthClass} ${className ?? ''}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              active ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
