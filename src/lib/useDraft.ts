// P-15: long forms keep a draft on the phone, so a closed or crashed app
// can offer "Continue draft?". Drafts are per-user data and are cleared at
// logout (see storage.ts).

import {useCallback, useEffect, useRef, useState} from 'react';
import {readJson, removeKey, StorageKeys, writeJson} from './storage';

export function useDraft<T>(key: string, value: T, {enabled = true, delayMs = 800} = {}) {
  const storageKey = `${StorageKeys.draftPrefix}${key}`;
  const [saved, setSaved] = useState<T | null>(null);
  const [checked, setChecked] = useState(false);
  const paused = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    readJson<T | null>(storageKey, null).then(draft => {
      setSaved(draft);
      setChecked(true);
    });
  }, [storageKey]);

  // Save a moment after the user stops typing, once they've decided about
  // an existing draft.
  useEffect(() => {
    if (!enabled || paused.current || !checked) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => writeJson(storageKey, value), delayMs);
    return () => clearTimeout(timer.current);
  }, [value, enabled, checked, storageKey, delayMs]);

  const start = useCallback(() => {
    paused.current = false;
  }, []);

  const discard = useCallback(async () => {
    setSaved(null);
    await removeKey(storageKey);
  }, [storageKey]);

  /** Call after a successful submit. */
  const clear = useCallback(async () => {
    paused.current = true;
    clearTimeout(timer.current);
    setSaved(null);
    await removeKey(storageKey);
  }, [storageKey]);

  return {saved, checked, start, discard, clear};
}
