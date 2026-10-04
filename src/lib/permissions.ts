// Permissions are asked only when first needed (S4). SMS, phone-state and
// all-files permissions are no longer used at all.

import {Linking, PermissionsAndroid, Platform, type Permission} from 'react-native';

export type AppPermission = 'camera' | 'notifications';

function androidPermission(kind: AppPermission): Permission | null {
  if (kind === 'camera') {
    return PermissionsAndroid.PERMISSIONS.CAMERA;
  }
  // POST_NOTIFICATIONS exists from Android 13.
  if (kind === 'notifications' && Number(Platform.Version) >= 33) {
    return (PermissionsAndroid.PERMISSIONS as Record<string, Permission>).POST_NOTIFICATIONS ?? null;
  }
  return null;
}

export type PermissionResult = 'granted' | 'denied' | 'blocked';

export async function ensurePermission(kind: AppPermission): Promise<PermissionResult> {
  if (Platform.OS !== 'android') {
    return 'granted';
  }
  const permission = androidPermission(kind);
  if (!permission) {
    return 'granted';
  }
  if (await PermissionsAndroid.check(permission)) {
    return 'granted';
  }
  const result = await PermissionsAndroid.request(permission);
  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }
  return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}

export function openAppSettings() {
  return Linking.openSettings();
}
