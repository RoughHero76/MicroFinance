// Mandatory update (server minimum version): a full screen over the whole
// app that can't be closed. Only Update (with progress and Retry) is
// offered; Android's back button leaves the app instead of getting past it.

import React, {useEffect} from 'react';
import {BackHandler, ScrollView, StatusBar, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {makeStyles, statusBarStyle, useTheme} from '@/theme';
import {Appear, BrandLogo, Button, Card, Icon, ProgressBar, Text} from '@/ui';
import {useUpdates} from './updates';

export default function UpdateGate() {
  const {required, update, currentVersion, download, install} = useUpdates();
  if (!required || !update) return null;
  return (
    <Gate
      version={update.latestVersion}
      notes={update.notes}
      from={currentVersion}
      download={download}
      install={install}
    />
  );
}

function Gate({
  version,
  notes,
  from,
  download,
  install,
}: {
  version: string;
  notes?: string[];
  from: string;
  download: ReturnType<typeof useUpdates>['download'];
  install: () => Promise<void>;
}) {
  const t = useTheme();
  const s = useStyles();
  const {t: tr} = useTranslation();
  const insets = useSafeAreaInsets();
  const downloading = download.status === 'downloading';

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, s.screen]} accessibilityViewIsModal>
      <StatusBar barStyle={statusBarStyle(t)} backgroundColor={t.colors.bg} />
      <ScrollView contentContainerStyle={[s.content, {paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24}]}>
        <Appear>
          <BrandLogo width={150} height={60} style={s.logo} />
        </Appear>
        <Appear index={1} style={s.center}>
          <View style={s.badge}>
            <Icon name="download" size={30} color="primary" />
          </View>
          <Text variant="h1" weight="bold" align="center">
            {tr('app.requiredTitle')}
          </Text>
          <Text color="muted" align="center" style={s.message}>
            {tr('app.requiredMessage')}
          </Text>
          <Text variant="small" color="muted" align="center">
            {tr('app.updateVersions', {from, to: version})}
          </Text>
        </Appear>
        {notes?.length ? (
          <Appear index={2}>
            <Card style={s.notes}>
              {notes.map(note => (
                <View key={note} style={s.note}>
                  <Icon name="check" size={16} color="success" />
                  <Text variant="small" style={s.flex}>
                    {note}
                  </Text>
                </View>
              ))}
            </Card>
          </Appear>
        ) : null}
        <Appear index={3} style={s.center}>
          {downloading ? (
            <View style={s.progress}>
              <ProgressBar value={download.progress} />
              <Text variant="small" color="muted" align="center">
                {tr('app.downloading', {percent: Math.round(download.progress * 100)})}
              </Text>
            </View>
          ) : null}
          {download.status === 'error' ? (
            <Text variant="small" color="danger" align="center">
              {download.message === 'install' ? tr('app.installFailed') : tr('app.updateFailed')}
            </Text>
          ) : null}
          <Button
            title={download.status === 'error' ? tr('common.retry') : tr('app.updateNow')}
            icon="download"
            onPress={install}
            loading={downloading}
            style={s.button}
          />
        </Appear>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(t => ({
  screen: {backgroundColor: t.colors.bg, zIndex: 1000, elevation: 1000},
  content: {flexGrow: 1, paddingHorizontal: t.space.xl, gap: t.space.lg},
  logo: {alignSelf: 'center'},
  center: {alignItems: 'center', gap: t.space.sm},
  badge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.space.sm,
  },
  message: {maxWidth: 320},
  notes: {gap: t.space.sm},
  note: {flexDirection: 'row', alignItems: 'flex-start', gap: t.space.sm},
  flex: {flex: 1},
  progress: {alignSelf: 'stretch', gap: t.space.sm},
  button: {marginTop: t.space.sm, paddingHorizontal: t.space.xl, minHeight: 44},
}));
