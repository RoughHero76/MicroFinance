import AsyncStorage from '@react-native-async-storage/async-storage';

// Every key the app stores on the phone, in one place (the session's own
// keys are in session.ts; the token is in the keychain).
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
  // E-12: payments saved on the phone, per person (payQueue.<uid>). Not
  // cleared at logout: it's money someone collected.
  payQueuePrefix: 'payQueue.',
} as const;

// Keys that belong to the signed-in person and are removed at logout, so a
// shared phone never shows the previous person's data. Theme and language
// stay.
export const PER_USER_PREFIXES = [
  StorageKeys.quickUnlock,
  StorageKeys.appLock,
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
    if (toRemove.length) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch {
    // ignore
  }
}
