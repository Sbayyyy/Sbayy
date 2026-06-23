import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'next-i18next';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showLabel?: string;
  hideLabel?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = '', showLabel, hideLabel, disabled, ...props }, ref) => {
    const { t } = useTranslation('common');
    const [visible, setVisible] = useState(false);
    const label = visible
      ? hideLabel ?? t('auth.passwordToggle.hide')
      : showLabel ?? t('auth.passwordToggle.show');
    const Icon = visible ? EyeOff : Eye;

    return (
      <div className="relative">
        <input
          ref={ref}
          {...props}
          disabled={disabled}
          type={visible ? 'text' : 'password'}
          className={`input pe-12 ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible(value => !value)}
          disabled={disabled}
          className="absolute end-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          aria-label={label}
          title={label}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
