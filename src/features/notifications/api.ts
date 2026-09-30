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
