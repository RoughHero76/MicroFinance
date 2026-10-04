// Quick unlock and app lock (S2b, X3): after the first password login the
// app opens with the phone's fingerprint or PIN/pattern while the 30-day
// session is valid. The password is never stored; the token is kept in the
// Android Keystore-backed keychain (see lib/session.ts).

import ReactNativeBiometrics from 'react-native-biometrics';
import {readJson, StorageKeys, writeJson} from '@/lib/storage';

const biometrics = new ReactNativeBiometrics({allowDeviceCredentials: true});

export interface LockSettings {
  enabled: boolean;
  /** Lock after the app has been in the background this long. */
  afterMs: number;
}

export const LOCK_AFTER_OPTIONS = [0, 60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000];
const DEFAULT_LOCK: LockSettings = {enabled: true, afterMs: 60 * 1000};

/** True when the phone has a fingerprint or a screen lock we can use. */
export async function canUseDeviceLock(): Promise<boolean> {
  try {
    const {available} = await biometrics.isSensorAvailable();
    return available;
  } catch {
    return false;
  }
}

export async function getLockSettings(): Promise<LockSettings> {
  return {...DEFAULT_LOCK, ...(await readJson<Partial<LockSettings>>(StorageKeys.appLock, {}))};
}

export function saveLockSettings(settings: LockSettings) {
  return writeJson(StorageKeys.appLock, settings);
}

/** Shows the phone's own fingerprint / PIN prompt. */
export async function promptUnlock(message: string): Promise<boolean> {
  try {
    const {success} = await biometrics.simplePrompt({promptMessage: message, cancelButtonText: 'Cancel'});
    return success;
  } catch {
    return false;
  }
}
