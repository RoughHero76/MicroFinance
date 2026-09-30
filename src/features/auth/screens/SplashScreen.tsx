// S1: the brand logo and tagline on the theme background while the session
// is restored (shown for at least a second, as before, to avoid a flash).

import React from 'react';
import {ActivityIndicator, StatusBar, View} from 'react-native';
import {getVersion} from 'react-native-device-info';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {makeStyles, statusBarStyle, useTheme} from '@/theme';
import {BrandLogo, Text} from '@/ui';

export default function SplashScreen() {
  const t = useTheme();
  const s = useStyles();
  const {t: tr} = useTranslation();
  return (
    <View style={s.screen}>
      <StatusBar barStyle={statusBarStyle(t)} backgroundColor={t.colors.bg} />
      <View style={s.center}>
        <BrandLogo width={200} height={80} />
        <Text variant="bodyLg" color="muted" style={s.tagline}>
          {brand.tagline}
        </Text>
        <ActivityIndicator color={t.colors.primary} style={s.spinner} />
      </View>
      <Text variant="caption" color="muted" align="center" style={s.footer}>
        v{getVersion()}
        {brand.showPoweredBy ? ` · ${tr('auth.poweredBy', {name: brand.poweredBy})}` : ''}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(t => ({
  screen: {flex: 1, backgroundColor: t.colors.bg},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.space.xl},
  tagline: {marginTop: t.space.md},
  spinner: {marginTop: t.space.xl},
  footer: {paddingBottom: t.space.xl},
}));
