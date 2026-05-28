import { useCallback, useRef, useState } from 'react';
import { toast } from '@/lib/toast';

interface UseAsyncActionOptions<T> {
  /** Toast text on success. Pass a function for messages derived from the result. */
  successMessage?: string | ((result: T) => string);
  /** Toast text on failure. Pass a function for messages derived from the error. */
  errorMessage?: string | ((err: unknown) => string);
  /** Suppress toast notifications entirely (useful for actions with custom feedback). */
  silent?: boolean;
  /** Called on success after the toast fires. */
  onSuccess?: (result: T) => void;
  /** Called on failure after the toast fires. */
  onError?: (err: unknown) => void;
}

interface AsyncActionState<T> {
  loading: boolean;
  error: unknown | null;
  result: T | null;
}

/**
 * Wraps an async function with loading state, error capture, optional
 * success/error toasts, and double-fire protection.
 *
 * The returned `run` function is stable across renders, safe to put in
 * dependency arrays. Concurrent invocations are dropped while a call is
 * already in flight — useful for buttons where the user might double-click.
 *
 * Example:
 *   const removeFavorite = useAsyncAction(
 *     async (id: string) => api.removeFavorite(id),
 *     { successMessage: t('favorites.removeSuccess'), errorMessage: t('favorites.removeError') }
 *   );
 *   <button onClick={() => removeFavorite.run(id)} disabled={removeFavorite.loading}>…</button>
 */
export function useAsyncAction<Args extends unknown[], T>(
  action: (...args: Args) => Promise<T>,
  options: UseAsyncActionOptions<T> = {}
) {
  const [state, setState] = useState<AsyncActionState<T>>({ loading: false, error: null, result: null });
  const inFlightRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const run = useCallback(
    async (...args: Args): Promise<T | null> => {
      if (inFlightRef.current) return null;
      inFlightRef.current = true;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await action(...args);
        const opts = optionsRef.current;
        setState({ loading: false, error: null, result });
        if (!opts.silent && opts.successMessage) {
          const msg = typeof opts.successMessage === 'function' ? opts.successMessage(result) : opts.successMessage;
          if (msg) toast.success(msg);
        }
        opts.onSuccess?.(result);
        return result;
      } catch (err) {
        const opts = optionsRef.current;
        setState({ loading: false, error: err, result: null });
        if (!opts.silent && opts.errorMessage) {
          const msg = typeof opts.errorMessage === 'function' ? opts.errorMessage(err) : opts.errorMessage;
          if (msg) toast.error(msg);
        }
        opts.onError?.(err);
        return null;
      } finally {
        inFlightRef.current = false;
      }
    },
    [action]
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null, result: null });
  }, []);

  return { run, reset, loading: state.loading, error: state.error, result: state.result };
}
