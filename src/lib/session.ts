// Where the signed-in session lives on the phone. The profile (name, role)
// is in AsyncStorage; the token is only in the Android Keystore-backed
// keychain (W6). Sessions saved by older versions keep working: their
// AsyncStorage token is moved to the keychain on first load. If a phone's
// keychain fails, the token falls back to AsyncStorage so sign-in still
// works there.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

export type Role = 'admin' | 'employee';

export interface SessionUser {
  /** Employees get _id at login; admins only get uid. */
  _id?: string;
  uid?: string;
  fname?: string;
  lname?: string;
  email?: string;
  userName?: string;
  role: Role;
  profilePic?: string | null;
}

const KEYS = {user: 'user', token: 'token', isLoggedIn: 'isLoggedIn', role: 'userRole'} as const;
const SERVICE = 'session.token';

// Read on every request, so kept in memory once loaded.
let memoryToken: string | null = null;

async function writeToken(token: string): Promise<void> {
  try {
    await Keychain.setGenericPassword('token', token, {service: SERVICE});
    await AsyncStorage.removeItem(KEYS.token);
  } catch {
    await AsyncStorage.setItem(KEYS.token, token);
  }
}

async function readToken(): Promise<string | null> {
  try {
    const entry = await Keychain.getGenericPassword({service: SERVICE});
    if (entry && entry.password) return entry.password;
  } catch {
    // fall through to the fallback / old location
  }
  const old = await AsyncStorage.getItem(KEYS.token);
  if (old) await writeToken(old); // moves it into the keychain when possible
  return old;
}

export async function getToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = await readToken();
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export async function saveSession(user: SessionUser, token: string): Promise<void> {
  memoryToken = token;
  await writeToken(token);
  await AsyncStorage.multiSet([
    [KEYS.user, JSON.stringify(user)],
    [KEYS.isLoggedIn, 'true'],
    [KEYS.role, user.role],
  ]);
}

export async function loadSession(): Promise<{user: SessionUser; token: string} | null> {
  try {
    const [[, user], [, loggedIn]] = await AsyncStorage.multiGet([KEYS.user, KEYS.isLoggedIn]);
    if (!user || loggedIn !== 'true') {
      return null;
    }
    memoryToken = null;
    const token = await getToken();
    if (!token) return null;
    return {user: JSON.parse(user) as SessionUser, token};
  } catch {
    return null;
  }
}

export async function updateSessionUser(user: SessionUser): Promise<void> {
  await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  memoryToken = null;
  await AsyncStorage.multiRemove([KEYS.user, KEYS.token, KEYS.isLoggedIn, KEYS.role]);
  try {
    await Keychain.resetGenericPassword({service: SERVICE});
  } catch {
    // nothing stored
  }
}
