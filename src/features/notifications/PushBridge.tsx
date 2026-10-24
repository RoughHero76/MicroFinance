// Connects phone notifications to the signed-in app: registers this phone
// (again when the language or the Firebase token changes), shows a toast
// for pushes that arrive while the app is open, and opens the linked screen
// when a notification is tapped (also when it started the app).

import {useCallback, useEffect, type RefObject} from 'react';
import type {NavigationContainerRef} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {onForegroundPush, onPushOpened, registerPush, watchTokenRefresh, type PushMessage} from '@/lib/push';
import {toast} from '@/ui';
import {markRead, notificationKeys} from './api';
import {openNotification} from './text';

type NavRef = RefObject<NavigationContainerRef<ReactNavigation.RootParamList>>;

export function PushBridge({navRef}: {navRef: NavRef}) {
  const {t} = useTranslation();
  const {lang} = useI18n();
  const queryClient = useQueryClient();

  const open = useCallback(
    (message: PushMessage) => {
      const data = (message.data ?? {}) as Record<string, string | undefined>;
      if (data.notificationId) {
        // P-05: counted as opened from the phone notification.
        markRead(data.notificationId, 'push').catch(() => undefined);
      }
      queryClient.invalidateQueries({queryKey: notificationKeys.all});
      const notification = {
        _id: data.notificationId ?? '',
        type: data.type ?? '',
        params: {},
        link: {screen: data.screen, id: data.id},
        readAt: null,
        createdAt: '',
      };
      // At a cold start (or right after unlock) the navigator may still be
      // mounting.
      const go = (tries = 0) => {
        const nav = navRef.current;
        if (nav?.isReady()) {
          openNotification(nav as never, nav.getRootState() as never, notification);
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
      // Data-only messages carry their text in data.
      const title = message.notification?.title ?? (message.data?.title as string | undefined);
      if (title) {
        toast.info(title, {
          message: message.notification?.body ?? (message.data?.body as string | undefined),
          action: {label: t('notifications.open'), onPress: () => open(message)},
        });
      }
    });
    // Also the tap that started the app, or one that waited for unlock.
    const offOpened = onPushOpened(open);
    return () => {
      offForeground();
      offOpened();
    };
  }, [open, queryClient, t]);

  return null;
}
