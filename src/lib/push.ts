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
    await api.post('/shared/devices', {token, lang, platform: Platform.OS, appVersion: getVersion()});
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

/** Taps on a notification while the app was in the background. */
export function onPushOpened(listener: (message: PushMessage) => void): () => void {
  return onNotificationOpenedApp(getMessaging(), listener);
}

/** The notification that started the app from closed, if any (once). */
export async function initialPush(): Promise<PushMessage | null> {
  try {
    return await getInitialNotification(getMessaging());
  } catch {
    return null;
  }
}

/** index.js: pushes are shown by Android; nothing to do in the background. */
export function registerBackgroundHandler(): void {
  setBackgroundMessageHandler(getMessaging(), async () => undefined);
}
