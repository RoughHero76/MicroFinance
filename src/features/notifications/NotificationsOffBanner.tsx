// F-04: notifications blocked for the app in Android settings mean every
// push is silently lost. Home and Settings say so, with a way to turn them
// back on: the system prompt while Android still allows asking, otherwise
// the app's settings page. Checked again whenever the app comes back.

import React, {useCallback, useEffect, useState} from 'react';
import {AppState, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {isPushEnabled, notificationsAllowed, registerPush} from '@/lib/push';
import {ensurePermission, openAppSettings} from '@/lib/permissions';
import {makeStyles} from '@/theme';
import {Button, Card, Icon, Text} from '@/ui';

export function NotificationsOffBanner() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const [off, setOff] = useState(false);

  const check = useCallback(async () => {
    // Turned off in the app on purpose: not our business to nag.
    if (!(await isPushEnabled())) return setOff(false);
    setOff((await notificationsAllowed()) === false);
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  if (!off) return null;

  const turnOn = async () => {
    const result = await ensurePermission('notifications');
    if (result !== 'granted' || (await notificationsAllowed()) === false) {
      await openAppSettings();
      return;
    }
    setOff(false);
    registerPush(lang);
  };

  return (
    <Card style={s.card}>
      <View style={s.row}>
        <Icon name="bell-off-outline" size={22} color="warning" />
        <View style={s.text}>
          <Text weight="semibold">{t('notifications.off.title')}</Text>
          <Text variant="small" color="muted">
            {t('notifications.off.hint')}
          </Text>
        </View>
      </View>
      <View style={s.actions}>
        <Button title={t('notifications.off.turnOn')} onPress={turnOn} />
      </View>
    </Card>
  );
}

const useStyles = makeStyles(t => ({
  card: {marginBottom: t.space.lg},
  row: {flexDirection: 'row', gap: t.space.md, alignItems: 'flex-start'},
  text: {flex: 1, gap: 2},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: t.space.md},
}));
