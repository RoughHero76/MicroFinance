// Where the signed-in session lives on the phone. The keys match what the
// old screens (HomeContext) read, so old and new code share one session.

import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Read on every request (not cached), because old screens still write and
// remove the token directly.
export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.token);
  } catch {
    return null;
  }
}

export async function saveSession(user: SessionUser, token: string): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.user, JSON.stringify(user)],
    [KEYS.token, token],
    [KEYS.isLoggedIn, 'true'],
    [KEYS.role, user.role],
  ]);
}

export async function loadSession(): Promise<{user: SessionUser; token: string} | null> {
  try {
    const [[, user], [, token], [, loggedIn]] = await AsyncStorage.multiGet([KEYS.user, KEYS.token, KEYS.isLoggedIn]);
    if (!user || !token || loggedIn !== 'true') {
      return null;
    }
    return {user: JSON.parse(user) as SessionUser, token};
  } catch {
    return null;
  }
}

export async function updateSessionUser(user: SessionUser): Promise<void> {
  await AsyncStorage.setItem(KEYS.user, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.user, KEYS.token, KEYS.isLoggedIn, KEYS.role]);
}
