import { useCallback, useRef, useState } from 'react';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

/**
 * Runs a service call with loading state and consistent toast feedback.
 * Returns the result, or undefined if it failed (the error is shown as a toast).
 */
export function useAction() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, opts: { success?: string | ((r: T) => string); successTitle?: string; errorTitle?: string } = {}): Promise<T | undefined> => {
      if (busy.current) return undefined;
      busy.current = true;
      setLoading(true);
      try {
        const result = await fn();
        if (opts.success) {
          const message = typeof opts.success === 'function' ? opts.success(result) : opts.success;
          toast.show({ tone: 'success', title: opts.successTitle ?? message, message: opts.successTitle ? message : undefined });
        }
        return result;
      } catch (err) {
        toast.show({ tone: 'danger', title: opts.errorTitle ?? 'Action not completed', message: getErrorMessage(err) });
        return undefined;
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [toast]
  );

  return { run, loading };
}
