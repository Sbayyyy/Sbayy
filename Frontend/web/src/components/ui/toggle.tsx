interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  /** Optional id when used with an external <label htmlFor>. */
  id?: string;
}

/**
 * Accessible switch primitive used wherever we need a boolean toggle —
 * notification preferences, privacy settings, etc. Replaces the inline
 * `Toggle` previously embedded inside `profile/settings.tsx`.
 */
export default function Toggle({ checked, onChange, disabled = false, label, description, id }: ToggleProps) {
  const switchEl = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={!label ? description : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      id={id}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
        checked ? 'bg-primary-600' : 'bg-slate-200'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );

  if (!label && !description) return switchEl;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-semibold text-slate-900">
            {label}
          </label>
        )}
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {switchEl}
    </div>
  );
}
