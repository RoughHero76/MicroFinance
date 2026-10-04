// X5 notifications (BE-16): a server list per person, stored as a type plus
// parameters so the app writes the text in English or Hindi.

import {api} from '@/lib/api';
import type {Page} from '@/lib/useInfiniteList';

export interface AppNotification {
  _id: string;
  type: string;
  title?: string;
  body?: string;
  params: Record<string, unknown>;
  link?: {screen?: string; id?: string};
  /** The server's text in other languages, for types the app doesn't know. */
  i18n?: {hi?: {title?: string; body?: string}};
  readAt: string | null;
  createdAt: string;
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread'] as const,
};

export async function getNotificationsPage(page: number): Promise<Page<AppNotification>> {
  const res = await api.get<{data: AppNotification[]; meta?: {page: number; totalPages: number; total: number}}>(
    '/shared/notifications',
    {page, limit: 20},
  );
  return {items: res.data ?? [], page, totalPages: res.meta?.totalPages || 1, total: res.meta?.total};
}

export async function getUnreadCount(): Promise<number> {
  const res = await api.get<{data: {count: number}}>('/shared/notifications/unread-count');
  return res.data?.count ?? 0;
}

export const markRead = (id: string) => api.post(`/shared/notifications/${id}/read`);
export const markAllRead = () => api.post('/shared/notifications/read-all');

export interface PushTestResult {
  /** The server has its Firebase key. */
  configured: boolean;
  /** Phones registered for this person. */
  devices: number;
  sent?: number;
  failed?: number;
  errors?: string[];
  /** Seconds until the server sends it (when a delay was asked for). */
  scheduledIn?: number;
}

/**
 * Sends the signed-in person a test notification. With a delay the server
 * answers at once and sends it later, so it can be seen in the notification
 * bar (Android shows pushes there only while the app is in the background).
 */
export async function sendTestNotification(delaySeconds = 0): Promise<PushTestResult> {
  const res = await api.post<{data: PushTestResult}>('/shared/notifications/test', {delaySeconds});
  return res.data;
}

export type SendTo = 'employees' | 'admins' | 'everyone' | string[];

export interface SendResult {
  recipients: number;
  push?: {configured: boolean; sent?: number; failed?: number};
}

/** Admins: a message of their own to employees, admins or everyone. */
export async function sendNotification(input: {to: SendTo; title: string; message: string}): Promise<SendResult> {
  const res = await api.post<{data: SendResult}>('/shared/notifications/send', input);
  return res.data;
}
