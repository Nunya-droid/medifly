import { useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/services/api';

/**
 * Loads async service data identified by `key` (null = don't load).
 * Results are tagged with the key they were fetched for, so `loading` is derived
 * rather than set synchronously inside the effect.
 */
export function useResource<T>(key: string | null, fetcher: () => Promise<T>) {
  const [state, setState] = useState<{ key: string; data?: T; error?: string } | null>(null);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });
  useEffect(() => {
    if (key == null) return;
    let alive = true;
    fetcherRef
      .current()
      .then((data) => alive && setState({ key, data }))
      .catch((e) => alive && setState({ key, error: getErrorMessage(e) }));
    return () => {
      alive = false;
    };
  }, [key]);
  const current = state && state.key === key ? state : null;
  return { data: current?.data, error: current?.error, loading: key != null && !current };
}
