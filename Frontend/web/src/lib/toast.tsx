import { create } from 'zustand';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, title?: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type, title) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, title }]
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  }
}));

export const toast = {
  success: (message: string, title?: string) => useToastStore.getState().addToast(message, 'success', title),
  error: (message: string, title?: string) => useToastStore.getState().addToast(message, 'error', title),
  warning: (message: string, title?: string) => useToastStore.getState().addToast(message, 'warning', title),
  info: (message: string, title?: string) => useToastStore.getState().addToast(message, 'info', title)
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-white" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-white" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-white" />;
      case 'info':
        return <AlertCircle className="h-5 w-5 text-white" />;
    }
  };

  const getTone = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          card: 'border-emerald-200 bg-white',
          icon: 'bg-emerald-600',
          title: 'Success'
        };
      case 'error':
        return {
          card: 'border-red-200 bg-white',
          icon: 'bg-red-600',
          title: 'Something went wrong'
        };
      case 'warning':
        return {
          card: 'border-amber-200 bg-white',
          icon: 'bg-amber-600',
          title: 'Check this'
        };
      case 'info':
        return {
          card: 'border-primary-200 bg-white',
          icon: 'bg-primary-600',
          title: 'SBay'
        };
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-50 w-[calc(100%-2rem)] max-w-md space-y-3 sm:w-auto">
      {toasts.map((toast) => {
        const tone = getTone(toast.type);
        return (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl shadow-slate-950/15 backdrop-blur animate-in slide-in-from-top duration-200 ${tone.card}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone.icon}`}>
            {getIcon(toast.type)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-950">{toast.title ?? tone.title}</p>
            <p className="mt-1 text-sm leading-5 text-slate-600">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        );
      })}
    </div>
  );
}
