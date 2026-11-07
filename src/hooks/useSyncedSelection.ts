import { useState } from 'react';

/**
 * Local selection that follows a URL param when the param changes
 * (React's "adjust state while rendering" pattern — no effect needed).
 */
export function useSyncedSelection(param: string | undefined) {
  const [selected, setSelected] = useState<string | undefined>(param);
  const [prevParam, setPrevParam] = useState(param);
  if (param !== prevParam) {
    setPrevParam(param);
    if (param) setSelected(param);
  }
  return [selected, setSelected] as const;
}
