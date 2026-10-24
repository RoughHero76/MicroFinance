// P-04: the kinds of phone notification a person can turn off, and the
// quiet hours (fixed on the server: 21:00–08:00). Turned-off kinds still
// appear in the app's list.

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '@/lib/api';

export interface NotificationPrefs {
  categories: {key: string; on: boolean; locked: boolean}[];
  quietHours: {from: number; to: number};
}

const prefsKey = ['notifications', 'prefs'] as const;

async function getPrefs(): Promise<NotificationPrefs> {
  const res = await api.get<{data: NotificationPrefs}>('/shared/notifications/prefs');
  return res.data;
}

async function savePrefs(muted: string[]): Promise<NotificationPrefs> {
  const res = await api.put<{data: NotificationPrefs}>('/shared/notifications/prefs', {muted});
  return res.data;
}

export function useNotificationPrefs() {
  const queryClient = useQueryClient();
  const query = useQuery({queryKey: prefsKey, queryFn: getPrefs, staleTime: 5 * 60 * 1000});
  const mutation = useMutation({
    mutationFn: savePrefs,
    onSuccess: data => queryClient.setQueryData(prefsKey, data),
  });
  const toggle = (key: string, on: boolean) => {
    const current = query.data?.categories ?? [];
    const muted = current.filter(c => !c.locked && (c.key === key ? !on : !c.on)).map(c => c.key);
    // Show the change at once; the server's answer replaces it.
    queryClient.setQueryData<NotificationPrefs>(prefsKey, (old: NotificationPrefs | undefined) =>
      old ? {...old, categories: old.categories.map(c => (c.key === key ? {...c, on} : c))} : old,
    );
    mutation.mutate(muted, {onError: () => queryClient.invalidateQueries({queryKey: prefsKey})});
  };
  return {prefs: query.data, loading: query.isLoading, toggle};
}
