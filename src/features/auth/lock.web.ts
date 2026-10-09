// Quick unlock on the web: a 6-digit PIN instead of the phone's fingerprint
// (see lib/sealedSession.ts for how the session is kept). App lock is only
// "on" while a PIN copy of the session exists.

import {askNewPin} from '@/lib/pinPrompt';
import {hasSealedSession, removeSealedSession, sealSession} from '@/lib/session';
import {readJson, StorageKeys, writeJson} from '@/lib/storage';

export interface LockSettings {
  enabled: boolean;
  /** Lock after the page has been in the background this long. */
  afterMs: number;
}

export const LOCK_AFTER_OPTIONS = [0, 60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000];
const DEFAULT_LOCK: LockSettings = {enabled: false, afterMs: 5 * 60 * 1000};

/** Every browser can use a PIN. */
export async function canUseDeviceLock(): Promise<boolean> {
  return true;
}

export async function getLockSettings(): Promise<LockSettings> {
  const saved = {...DEFAULT_LOCK, ...(await readJson<Partial<LockSettings>>(StorageKeys.appLock, {}))};
  return {...saved, enabled: saved.enabled && hasSealedSession()};
}

export function saveLockSettings(settings: LockSettings) {
  if (!settings.enabled) removeSealedSession();
  return writeJson(StorageKeys.appLock, settings);
}

/** The phone's own prompt does not exist here; LockScreen.web asks for the PIN. */
export async function promptUnlock(_message: string): Promise<boolean> {
  return false;
}

/** Turning app lock on asks for a PIN first; false when the person cancels. */
export async function ensureLockReady(enabled: boolean): Promise<boolean> {
  if (!enabled || hasSealedSession()) return true;
  const pin = await askNewPin();
  return pin ? sealSession(pin) : false;
}
