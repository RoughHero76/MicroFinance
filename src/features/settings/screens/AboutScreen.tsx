// X6: version, update status with "Check again", legal links and "Powered
// by" from the brand file. 5 taps on the version opens the hidden developer
// screens (kit gallery in debug builds; Diagnostics for admins from W5).

import React, {useRef, useState} from 'react';
import {Pressable, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {getBuildNumber} from 'react-native-device-info';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {openUrl} from '@/lib/messaging';
import {useUpdates} from '@/features/app/updates';
import {makeStyles} from '@/theme';
import {BrandLogo, Button, Card, Icon, OptionRow, ProgressBar, Screen, Text} from '@/ui';
import type {AppStackParamList} from '@/navigation/types';

export default function AboutScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {currentVersion, update, checking, lastCheckFound, check, download, install} = useUpdates();
  const [showLicences, setShowLicences] = useState(false);
  const taps = useRef<number[]>([]);

  const tapVersion = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter(ts => now - ts < 2000), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      const hidden = ['Diagnostics', 'KitGallery'].find(r => navigation.getState().routeNames.includes(r as never));
      if (hidden) navigation.navigate(hidden as never);
    }
  };

  return (
    <Screen header={{title: t('about.title')}} scroll>
      <Card style={s.head}>
        <BrandLogo width={160} height={64} />
        <Pressable onPress={tapVersion} accessibilityRole="text">
          <Text color="muted" style={s.version}>
            {t('about.version', {version: currentVersion, build: getBuildNumber()})}
          </Text>
        </Pressable>
        {update ? (
          <View style={s.status}>
            <Text weight="semibold" color="primary">
              {t('about.updateAvailable', {version: update.latestVersion})}
            </Text>
            {download.status === 'downloading' ? <ProgressBar value={download.progress} style={s.progress} /> : null}
            <Button
              title={t('app.install')}
              icon="download"
              onPress={install}
              loading={download.status === 'downloading'}
            />
          </View>
        ) : (
          <View style={s.upToDate}>
            {lastCheckFound === false ? <Icon name="check-circle" size={18} color="success" /> : null}
            <Text variant="small" color="muted">
              {lastCheckFound === false ? t('app.upToDate') : ''}
            </Text>
          </View>
        )}
        <Button
          title={t('app.checkAgain')}
          variant="text"
          icon="refresh"
          onPress={() => check(true)}
          loading={checking}
        />
      </Card>

      <Card padded={false} style={s.gap}>
        {brand.legal.termsUrl ? (
          <OptionRow
            icon="file-document-outline"
            title={t('about.terms')}
            onPress={() => openUrl(brand.legal.termsUrl)}
          />
        ) : null}
        {brand.legal.privacyUrl ? (
          <OptionRow
            icon="shield-account-outline"
            title={t('about.privacy')}
            onPress={() => openUrl(brand.legal.privacyUrl)}
          />
        ) : null}
        <OptionRow icon="code-braces" title={t('about.licences')} onPress={() => setShowLicences(v => !v)} />
        {showLicences ? (
          <Text variant="small" color="muted" style={s.licences}>
            {t('about.licencesText')}
          </Text>
        ) : null}
      </Card>

      {brand.showPoweredBy ? (
        <Text variant="small" color="muted" align="center" style={s.powered}>
          {t('auth.poweredBy', {name: brand.poweredBy})}
        </Text>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  head: {alignItems: 'center', gap: t.space.sm, paddingVertical: t.space.xl},
  version: {marginTop: t.space.sm},
  status: {alignItems: 'center', gap: t.space.sm, alignSelf: 'stretch'},
  progress: {alignSelf: 'stretch'},
  upToDate: {flexDirection: 'row', alignItems: 'center', gap: t.space.xs, minHeight: 22},
  gap: {marginTop: t.space.md},
  licences: {padding: t.space.lg},
  powered: {marginTop: t.space.xl},
}));
