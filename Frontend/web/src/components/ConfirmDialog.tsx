import { useEffect, useId, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'next-i18next';

/**
 * Props for the ConfirmDialog component.
 * @property {boolean} isOpen - Controls whether the dialog is visible.
 * @property {() => void} onClose - Called when the dialog is dismissed.
 * @property {() => void} onConfirm - Called when the user confirms the action.
 * @property {string} title - Dialog title text.
 * @property {string} message - Dialog body text.
 * @property {string} [confirmText] - Confirm button label (default from i18n).
 * @property {string} [cancelText] - Cancel button label (default from i18n).
 * @property {boolean} [danger] - When true, renders the dialog in a destructive style.
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

/**
 * Confirmation dialog with optional destructive styling.
 * @param {ConfirmDialogProps} props - Component props.
 * @returns {JSX.Element | null} Rendered dialog or null when closed.
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  danger = false
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');

  const resolvedConfirmText = confirmText || t('confirmDialog.confirm');
  const resolvedCancelText = cancelText || t('confirmDialog.cancel');

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!danger) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [danger, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const container = dialogRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!active || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const container = dialogRef.current;
    container?.addEventListener('keydown', handleTab);
    return () => container?.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={danger ? undefined : onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="surface-card relative mx-4 w-full max-w-md p-6 animate-in fade-in zoom-in duration-200"
      >
        <button
          onClick={onClose}
          ref={closeButtonRef}
          aria-label="Close dialog"
          className="icon-button absolute right-4 top-4 h-9 w-9 rtl:left-4 rtl:right-auto"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-4">
          {danger && (
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          )}

          <div className="flex-1">
            <h3 id={titleId} className="mb-2 text-lg font-bold text-slate-950">{title}</h3>
            <p id={descId} className="mb-6 text-slate-600">{message}</p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="btn btn-outline"
              >
                {resolvedCancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`btn ${
                  danger
                    ? 'btn-danger'
                    : 'btn-primary'
                }`}
              >
                {resolvedConfirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
