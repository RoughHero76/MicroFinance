// Phone notifications (Firebase) have no web counterpart yet: the in-app
// list still works, it just isn't pushed. Same exports as push.ts.

export type PushMessage = {data?: Record<string, string | undefined>; notification?: {title?: string; body?: string}};

export async function isPushEnabled(): Promise<boolean> {
  return false;
}
export async function registerPush(_lang: string): Promise<void> {}
export async function unregisterPush(): Promise<void> {}
export async function setPushEnabled(_enabled: boolean, _lang: string): Promise<void> {}
export function watchTokenRefresh(_lang: string): () => void {
  return () => undefined;
}
export function onForegroundPush(_listener: (message: PushMessage) => void): () => void {
  return () => undefined;
}
export function onPushOpened(_listener: (message: PushMessage) => void): () => void {
  return () => undefined;
}
export async function initialPush(): Promise<PushMessage | null> {
  return null;
}
export function registerBackgroundHandler(): void {}
