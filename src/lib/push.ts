// Phone notifications (Firebase Cloud Messaging). The backend pushes the
// same items as the in-app list; this registers the phone for the signed-in
// person (with its language), and turns a tap into the screen to open.
//
// Android shows pushes itself when the app is in the background or closed
// (channel "updates", created in MainApplication.kt). In the foreground the
// app shows a toast instead (PushBridge).

import {Platform} from 'react-native';
import {
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  hasPermission,
  AuthorizationStatus,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  setBackgroundMessageHandler,
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {getVersion} from 'react-native-device-info';
import {api} from './api';
import {readJson, writeJson} from './storage';

export type PushMessage = FirebaseMessagingTypes.RemoteMessage;

/** Device-wide (not per person): the "Phone notifications" switch in Settings. */
const ENABLED_KEY = 'settings.pushEnabled';
const REGISTERED_KEY = 'settings.pushToken';

export async function isPushEnabled(): Promise<boolean> {
  return readJson<boolean>(ENABLED_KEY, true);
}

/** Registers this phone for the signed-in person. Safe to call often. */
export async function registerPush(lang: string): Promise<void> {
  if (Platform.OS !== 'android' || !(await isPushEnabled())) return;
  try {
    const token = await getToken(getMessaging());
    // F-04: the server lists people whose notifications are blocked.
    const allowed = await notificationsAllowed();
    await api.post('/shared/devices', {
      token,
      lang,
      platform: Platform.OS,
      appVersion: getVersion(),
      ...(allowed === undefined ? {} : {notificationsAllowed: allowed}),
    });
    await writeJson(REGISTERED_KEY, token);
  } catch {
    // Offline or Play services missing: try again next start.
  }
}

/** Stops pushes to this phone (sign-out, or the switch turned off). */
let removing: Promise<void> | null = null;
export function unregisterPush(): Promise<void> {
  // One removal at a time, even if sign-out runs twice (e.g. after the 401
  // this call may get when the session already ended).
  removing = removing ?? removeToken().finally(() => (removing = null));
  return removing;
}

async function removeToken(): Promise<void> {
  const token = await readJson<string | null>(REGISTERED_KEY, null);
  if (!token) return;
  await writeJson(REGISTERED_KEY, null);
  // Never hold up sign-out for this: the server drops unused tokens anyway.
  await Promise.race([
    api.post('/shared/devices/remove', {token}).catch(() => undefined),
    new Promise(resolve => setTimeout(resolve, 2500)),
  ]);
  await deleteToken(getMessaging()).catch(() => undefined);
}

export async function setPushEnabled(enabled: boolean, lang: string): Promise<void> {
  await writeJson(ENABLED_KEY, enabled);
  if (enabled) await registerPush(lang);
  else await unregisterPush();
}

export function watchTokenRefresh(lang: string): () => void {
  return onTokenRefresh(getMessaging(), () => {
    registerPush(lang);
  });
}

export function onForegroundPush(listener: (message: PushMessage) => void): () => void {
  return onMessage(getMessaging(), listener);
}

// F-01: a tap is caught here, not in PushBridge. PushBridge only exists while
// signed in and unlocked, so a tap that wakes a locked app used to be lost.
// The tap waits until PushBridge is back (after unlock or sign-in).
let pendingTap: PushMessage | null = null;
let tapListener: ((message: PushMessage) => void) | null = null;
let initialChecked = false;

function deliverTap(message: PushMessage) {
  if (tapListener) tapListener(message);
  else pendingTap = message;
}

/** index.js: start listening for taps before anything else mounts. */
export function listenForTaps(): void {
  onNotificationOpenedApp(getMessaging(), deliverTap);
}

/**
 * Taps on a notification: the one that started the app (once per launch),
 * one waiting since the app was locked, and every later one.
 */
export function onPushOpened(listener: (message: PushMessage) => void): () => void {
  tapListener = listener;
  if (pendingTap) {
    const waiting = pendingTap;
    pendingTap = null;
    listener(waiting);
  }
  if (!initialChecked) {
    initialChecked = true;
    getInitialNotification(getMessaging())
      .then(message => message && deliverTap(message))
      .catch(() => undefined);
  }
  return () => {
    if (tapListener === listener) tapListener = null;
  };
}

/** Are notifications allowed for the app in Android settings? */
export async function notificationsAllowed(): Promise<boolean | undefined> {
  if (Platform.OS !== 'android') return undefined;
  try {
    const status = await hasPermission(getMessaging());
    return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
  } catch {
    return undefined;
  }
}

/** index.js: pushes are shown by Android; nothing to do in the background. */
export function registerBackgroundHandler(): void {
  setBackgroundMessageHandler(getMessaging(), async () => undefined);
}
