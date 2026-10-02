// S4: explains the few permissions left, once, after the first login. Each
// is asked only when first needed (camera when taking a photo); SMS and
// phone-state permissions are gone.

import React from 'react';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {ensurePermission} from '@/lib/permissions';
import {makeStyles} from '@/theme';
import {Button, Icon, Screen, Text} from '@/ui';

export default function PermissionsScreen({onDone}: {onDone: () => void}) {
  const s = useStyles();
  const {t} = useTranslation();
  const rows = [
    {icon: 'bell-outline', title: t('auth.permNotifications'), hint: t('auth.permNotificationsHint')},
    {icon: 'camera-outline', title: t('auth.permCamera'), hint: t('auth.permCameraHint')},
    {icon: 'folder-download-outline', title: t('auth.permFiles'), hint: t('auth.permFilesHint')},
  ];

  const finish = async () => {
    // Notifications need asking on Android 13+; the others wait until used.
    await ensurePermission('notifications').catch(() => undefined);
    onDone();
  };

  return (
    <Screen header={false} scroll>
      <View style={s.top}>
        <Text variant="h1">{t('auth.permTitle')}</Text>
        <Text color="muted" style={s.subtitle}>
          {t('auth.permSubtitle')}
        </Text>
      </View>
      {rows.map(row => (
        <View key={row.icon} style={s.row}>
          <View style={s.icon}>
            <Icon name={row.icon} size={22} color="primary" />
          </View>
          <View style={s.text}>
            <Text variant="bodyLg" weight="semibold">
              {row.title}
            </Text>
            <Text variant="small" color="muted">
              {row.hint}
            </Text>
          </View>
        </View>
      ))}
      <Button title={t('auth.continue')} onPress={finish} style={s.continue} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  top: {marginTop: t.space.xxl, marginBottom: t.space.xl},
  subtitle: {marginTop: t.space.xs},
  row: {flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingVertical: t.space.md},
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {flex: 1, gap: 2},
  continue: {alignSelf: 'flex-end', marginTop: t.space.xl},
}));
