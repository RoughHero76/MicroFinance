// The browser asks for the camera itself, at the moment it is used.

export type AppPermission = 'camera' | 'notifications';
export type PermissionResult = 'granted' | 'denied' | 'blocked';

export async function ensurePermission(_kind: AppPermission): Promise<PermissionResult> {
  return 'granted';
}

export async function openAppSettings(): Promise<void> {}
