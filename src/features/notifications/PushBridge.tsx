// Connects phone notifications to the signed-in app: registers this phone
// (again when the language or the Firebase token changes), shows a toast
// for pushes that arrive while the app is open, and opens the linked screen
// when a notification is tapped (also when it started the app).

import {useCallback, useEffect, type RefObject} from 'react';
import type {NavigationContainerRef} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {
  initialPush,
  onForegroundPush,
  onPushOpened,
  registerPush,
  watchTokenRefresh,
  type PushMessage,
} from '@/lib/push';
import {toast} from '@/ui';
import {markRead, notificationKeys} from './api';
import {notificationTarget} from './text';

type NavRef = RefObject<NavigationContainerRef<ReactNavigation.RootParamList>>;

export function PushBridge({navRef}: {navRef: NavRef}) {
  const {t} = useTranslation();
  const {lang} = useI18n();
  const queryClient = useQueryClient();

  const open = useCallback(
    (message: PushMessage) => {
      const data = (message.data ?? {}) as Record<string, string | undefined>;
      if (data.notificationId) {
        markRead(data.notificationId).catch(() => undefined);
      }
      queryClient.invalidateQueries({queryKey: notificationKeys.all});
      const target = notificationTarget({
        _id: data.notificationId ?? '',
        type: data.type ?? '',
        params: {},
        link: {screen: data.screen, id: data.id},
        readAt: null,
        createdAt: '',
      });
      // At a cold start the navigator may still be mounting.
      const go = (tries = 0) => {
        if (navRef.current?.isReady()) {
          if (target) navRef.current.navigate(target[0] as never, target[1] as never);
          else navRef.current.navigate('Notifications' as never);
        } else if (tries < 20) {
          setTimeout(() => go(tries + 1), 150);
        }
      };
      go();
    },
    [navRef, queryClient],
  );

  // Register for this person and language; follow token changes.
  useEffect(() => {
    registerPush(lang);
    return watchTokenRefresh(lang);
  }, [lang]);

  useEffect(() => {
    const offForeground = onForegroundPush(message => {
      queryClient.invalidateQueries({queryKey: notificationKeys.all});
      const title = message.notification?.title;
      if (title) {
        toast.info(title, {
          message: message.notification?.body,
          action: {label: t('notifications.open'), onPress: () => open(message)},
        });
      }
    });
    const offOpened = onPushOpened(open);
    initialPush().then(message => {
      if (message) open(message);
    });
    return () => {
      offForeground();
      offOpened();
    };
  }, [open, queryClient, t]);

  return null;
}
