// X2: mode (Light/Dark/System), colour and language, saved on the phone and
// applied immediately. With 2 languages the language is a switch; from the
// third (Marathi) it becomes a dropdown.

import React, {useEffect, useState} from 'react';
import {Platform, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import type {Lang} from '@/brand';
import {LANGUAGES, setLanguage, useI18n} from '@/i18n';
import {useUpdates} from '@/features/app/updates';
import {useCan} from '@/features/auth/SessionProvider';
import {sendTestNotification} from '@/features/notifications/api';
import {errorMessage} from '@/lib/api';
import {isPushEnabled, registerPush, setPushEnabled} from '@/lib/push';
import {makeStyles, palettes, useThemeSettings, type ModeSetting, type PaletteId} from '@/theme';
import {Card, Icon, OptionRow, PressableScale, Screen, Section, SegmentedControl, SelectField, Text, toast} from '@/ui';
import type {AppStackParamList} from '@/navigation/types';

const TEST_DELAY_S = 5;

export default function SettingsScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {theme, modeSetting, setModeSetting, setPalette, allowedPalettes} = useThemeSettings();
  const {currentVersion, update} = useUpdates();
  const can = useCan();
  const [push, setPush] = useState(true);
  useEffect(() => {
    isPushEnabled().then(setPush);
  }, []);
  const togglePush = (next: boolean) => {
    setPush(next);
    setPushEnabled(next, lang);
  };
  const [testing, setTesting] = useState(false);
  // Checks the whole chain on a live server: the server's key, this phone's
  // registration, and delivery.
  const testPush = async () => {
    if (testing) return;
    setTesting(true);
    try {
      await registerPush(lang);
      // 5 s, so there's time to leave the app: Android shows pushes in the
      // notification bar only while the app is in the background.
      const r = await sendTestNotification(TEST_DELAY_S);
      if (!r.configured) toast.error(t('settings.pushTestOff'));
      else if (!r.devices) toast.error(t('settings.pushTestNoPhone'));
      else if (r.scheduledIn) {
        toast.success(t('settings.pushTestSent'), {message: t('settings.pushTestSentHint', {seconds: r.scheduledIn})});
      } else if (!r.sent) toast.error(t('settings.pushTestFailed'), {message: r.errors?.[0]});
      else toast.success(t('settings.pushTestSent'));
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Screen header={{title: t('settings.title')}} scroll>
      <Section title={t('settings.appearance')}>
        <Card>
          <Text variant="label" weight="semibold" style={s.label}>
            {t('settings.mode')}
          </Text>
          <SegmentedControl<ModeSetting>
            options={[
              {value: 'light', label: t('settings.light')},
              {value: 'dark', label: t('settings.dark')},
              {value: 'system', label: t('settings.system')},
            ]}
            value={modeSetting}
            onChange={setModeSetting}
          />
          <Text variant="label" weight="semibold" style={[s.label, s.gap]}>
            {t('settings.colour')}
          </Text>
          <View style={s.swatches} accessibilityRole="radiogroup">
            {allowedPalettes.map(id => (
              <Swatch
                key={id}
                id={id}
                label={t(`settings.palette.${id}`)}
                selected={theme.palette === id}
                onPress={() => setPalette(id)}
              />
            ))}
          </View>
          <Text variant="label" weight="semibold" style={[s.label, s.gap]}>
            {t('settings.language')}
          </Text>
          {LANGUAGES.length <= 2 ? (
            <SegmentedControl<Lang>
              options={LANGUAGES.map(l => ({value: l.id, label: l.label}))}
              value={lang}
              onChange={setLanguage}
            />
          ) : (
            <SelectField<Lang>
              value={lang}
              options={LANGUAGES.map(l => ({value: l.id, label: l.label}))}
              onChange={setLanguage}
            />
          )}
        </Card>
      </Section>

      <Section title={t('settings.account')}>
        <Card padded={false} dividers>
          {Platform.OS !== 'web' ? (
            <OptionRow
              icon="bell-ring-outline"
              title={t('settings.push')}
              hint={t('settings.pushHint')}
              toggle={{value: push, onChange: togglePush}}
            />
          ) : null}
          {push && Platform.OS !== 'web' ? (
            <OptionRow icon="bell-check-outline" title={t('settings.pushTest')} onPress={testPush} />
          ) : null}
          <OptionRow
            icon="shield-lock-outline"
            title={t('settings.security')}
            onPress={() => navigation.navigate('Security')}
          />
          {can('settings.business') && navigation.getState().routeNames.includes('BusinessSettings' as never) ? (
            <OptionRow
              icon="briefcase-outline"
              title={t('settings.businessSettings')}
              onPress={() => navigation.navigate('BusinessSettings' as never)}
            />
          ) : null}
        </Card>
      </Section>

      <Section title={t('settings.about')}>
        <Card padded={false} dividers>
          <OptionRow
            icon="information-outline"
            title={t('settings.about')}
            value={`v${currentVersion}`}
            badge={update ? 1 : undefined}
            onPress={() => navigation.navigate('About')}
          />
        </Card>
      </Section>
    </Screen>
  );
}

function Swatch({
  id,
  label,
  selected,
  onPress,
}: {
  id: PaletteId;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const s = useStyles();
  const {theme} = useThemeSettings();
  const accent = palettes[id][theme.mode];
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="radio"
      accessibilityState={{selected}}
      accessibilityLabel={label}
      style={[s.swatch, selected && {borderColor: accent.primary}]}>
      {/* Mock X2: a gradient dot per palette, ringed when chosen. */}
      <LinearGradient colors={[accent.primary, accent.primary2]} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={s.dot}>
        {selected ? <Icon name="check" size={16} color={accent.onPrimary} /> : null}
      </LinearGradient>
    </PressableScale>
  );
}

const useStyles = makeStyles(t => ({
  label: {marginBottom: t.space.sm},
  gap: {marginTop: t.space.lg},
  swatches: {flexDirection: 'row', gap: 10, flexWrap: 'wrap'},
  swatch: {padding: 3, borderRadius: 22, borderWidth: 2, borderColor: 'transparent'},
  dot: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
}));
