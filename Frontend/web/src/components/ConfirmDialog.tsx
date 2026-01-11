import { useEffect, useId, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';

/**
 * Props for the ConfirmDialog component.
 * @property {boolean} isOpen - Controls whether the dialog is visible.
 * @property {() => void} onClose - Called when the dialog is dismissed.
 * @property {() => void} onConfirm - Called when the user confirms the action.
 * @property {string} title - Dialog title text.
 * @property {string} message - Dialog body text.
 * @property {string} [confirmText] - Confirm button label (default "تأكيد").
 * @property {string} [cancelText] - Cancel button label (default "إلغاء").
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
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  danger = false
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={danger ? undefined : onClose}
      />
      
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in duration-200"
      >
        <button
          onClick={onClose}
          ref={closeButtonRef}
          aria-label="Close dialog"
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-gray-400 hover:text-gray-600"
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
            <h3 id={titleId} className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p id={descId} className="text-gray-600 mb-6">{message}</p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  danger
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
