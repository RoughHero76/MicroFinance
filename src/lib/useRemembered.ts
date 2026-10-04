// P-05: a filter or tab that's remembered on this phone, so coming back to
// Loans, Payments or Leads shows what was chosen last time. `ready` turns
// true once the saved value is read (lists wait for it, so they don't load
// the default first).

import {useCallback, useEffect, useState} from 'react';
import {readJson, StorageKeys, writeJson} from './storage';

export function useRemembered<T>(key: string, initial: T): [T, (value: T) => void, boolean] {
  const storageKey = `${StorageKeys.filterPrefix}${key}`;
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    readJson<T | null>(storageKey, null)
      .then(saved => {
        if (alive && saved !== null) setValue(saved);
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [storageKey]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeJson(storageKey, next).catch(() => undefined);
    },
    [storageKey],
  );

  return [value, set, ready];
}
