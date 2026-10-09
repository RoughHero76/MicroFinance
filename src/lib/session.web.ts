// Where the signed-in session lives in a browser. The profile (name, role)
// is in localStorage like on the phone. The token lives only in
// sessionStorage, so closing the tab ends the session, unless the person
// turned on PIN unlock: then a copy locked with the PIN (lib/sealedSession)
// is kept, and reopening the site asks for the PIN.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isValidPin,
  MAX_PIN_TRIES,
  sealToken,
  unsealToken,
  type SealedToken,
} from './sealedSession';

export type Role = 'admin' | 'employee';

export interface SessionUser {
  _id?: string;
  uid?: string;
  fname?: string;
  lname?: string;
  email?: string;
  userName?: string;
  role: Role;
  profilePic?: string | null;
}

const KEYS = {user: 'user', isLoggedIn: 'isLoggedIn', role: 'userRole'} as const;
const TOKEN_KEY = 'session.token';
const SEALED_KEY = 'session.sealed';
const TRIES_KEY = 'session.pinTries';

let memoryToken: string | null = null;

function readSealed(): SealedToken | null {
  try {
    const raw = localStorage.getItem(SEALED_KEY);
    return raw ? (JSON.parse(raw) as SealedToken) : null;
  } catch {
    return null;
  }
}

export function hasSealedSession(): boolean {
  return readSealed() !== null;
}

function removeSealed() {
  try {
    localStorage.removeItem(SEALED_KEY);
    localStorage.removeItem(TRIES_KEY);
  } catch {
    // storage blocked: nothing was kept
  }
}

export async function getToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = sessionStorage.getItem(TOKEN_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export async function saveSession(user: SessionUser, token: string): Promise<void> {
  memoryToken = token;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // private mode: the token stays in memory for this page only
  }
  // A new sign-in makes an older PIN copy stale; the PIN is set up again.
  removeSealed();
  await AsyncStorage.multiSet([
    [KEYS.user, JSON.stringify(user)],
    [KEYS.isLoggedIn, 'true'],
    [KEYS.role, user.role],
  ]);
}

/**
 * A tab that is still open keeps its token. A reopened site has none, and if
 * a PIN copy exists the session is returned without a token until the PIN
 * unlocks it (the lock screen does that).
 */
export async function loadSession(): Promise<{user: SessionUser; token: string} | null> {
  try {
    const [[, user], [, loggedIn]] = await AsyncStorage.multiGet([KEYS.user, KEYS.isLoggedIn]);
    if (!user || loggedIn !== 'true') return null;
    const token = await getToken();
    if (token) return {user: JSON.parse(user) as SessionUser, token};
    if (hasSealedSession()) return {user: JSON.parse(user) as SessionUser, token: ''};
    return null;
  } catch {
    return null;
  }
}

export async function updateSessionUser(user: SessionUser): Promise<void> {
  await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  memoryToken = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing stored
  }
  removeSealed();
  await AsyncStorage.multiRemove([KEYS.user, KEYS.isLoggedIn, KEYS.role]);
}

/** Locks the current token with a PIN (turning PIN unlock on). */
export async function sealSession(pin: string): Promise<boolean> {
  const token = await getToken();
  if (!token || !isValidPin(pin)) return false;
  try {
    localStorage.setItem(SEALED_KEY, JSON.stringify(await sealToken(token, pin)));
    localStorage.removeItem(TRIES_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Turning PIN unlock off: the locked copy is deleted. */
export function removeSealedSession() {
  removeSealed();
}

export type PinResult = {ok: true} | {ok: false; triesLeft: number} | {ok: false; wiped: true};

/** Opens the session with the PIN. After 5 wrong tries the copy is deleted. */
export async function unsealSession(pin: string): Promise<PinResult> {
  const sealed = readSealed();
  if (!sealed) return {ok: false, wiped: true};
  const token = isValidPin(pin) ? await unsealToken(sealed, pin) : null;
  if (token) {
    memoryToken = token;
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TRIES_KEY);
    } catch {
      // kept in memory for this page
    }
    return {ok: true};
  }
  const tries = (Number(localStorage.getItem(TRIES_KEY)) || 0) + 1;
  if (tries >= MAX_PIN_TRIES) {
    await clearSession();
    return {ok: false, wiped: true};
  }
  localStorage.setItem(TRIES_KEY, String(tries));
  return {ok: false, triesLeft: MAX_PIN_TRIES - tries};
}
