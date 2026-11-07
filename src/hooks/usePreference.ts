import { useCallback, useState } from 'react';
import { storageService } from '@/services/storageService';

/** Small per-browser preference persisted in localStorage (e.g. selected delivery address). */
export function usePreference<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => storageService.read<T>(`pref:${key}`, initial));
  const set = useCallback(
    (v: T) => {
      setValue(v);
      storageService.write(`pref:${key}`, v);
    },
    [key]
  );
  return [value, set];
}
