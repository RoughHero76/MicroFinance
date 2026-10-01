// The Home bell with the unread count (X5). Refreshes when the app comes
// back to the front and every few minutes while it's open.

import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useSession} from '@/features/auth/SessionProvider';
import {IconButton} from '@/ui';
import {getUnreadCount, notificationKeys} from './api';

export function NotificationBell({variant = 'plain'}: {variant?: 'plain' | 'outline'}) {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {status} = useSession();
  const query = useQuery({
    queryKey: notificationKeys.unread,
    queryFn: getUnreadCount,
    enabled: status === 'signedIn',
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
  const count = query.data ?? 0;
  return (
    <IconButton
      icon={count ? 'bell-badge-outline' : 'bell-outline'}
      label={count ? t('notifications.bellUnread', {count}) : t('notifications.title')}
      variant={variant}
      badge={count}
      onPress={() => navigation.navigate('Notifications' as never)}
    />
  );
}
