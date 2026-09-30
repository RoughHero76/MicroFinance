import AsyncStorage from '@react-native-async-storage/async-storage';

// Every key the new code stores on the phone, in one place. The old screens
// still use 'user', 'token', 'isLoggedIn' and 'userRole' directly.
export const StorageKeys = {
  theme: 'settings.theme',
  language: 'settings.language',
  loginRole: 'settings.loginRole',
  appLock: 'settings.appLock',
  quickUnlock: 'session.quickUnlock',
  recentCustomers: 'recent.customers',
  recentSearches: 'recent.searches',
  queryCache: 'cache.queries',
  draftPrefix: 'draft.',
  filterPrefix: 'filters.',
  lastPaymentMethod: 'prefs.lastPaymentMethod',
  scheduleView: 'prefs.scheduleView',
  pendingCrash: 'crash.pending',
} as const;

// Keys that belong to the signed-in person and are removed at logout, so a
// shared phone never shows the previous person's data. Theme and language
// stay.
export const PER_USER_PREFIXES = [
  StorageKeys.quickUnlock,
  StorageKeys.recentCustomers,
  StorageKeys.recentSearches,
  StorageKeys.queryCache,
  StorageKeys.draftPrefix,
  StorageKeys.filterPrefix,
  StorageKeys.lastPaymentMethod,
];

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is a convenience; failing to save a preference isn't fatal.
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function clearPerUserStorage(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter(key => PER_USER_PREFIXES.some(prefix => key.startsWith(prefix)));
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  } catch {
    // ignore
  }
}
