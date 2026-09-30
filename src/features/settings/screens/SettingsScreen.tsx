// X2: mode (Light/Dark/System), colour and language, saved on the phone and
// applied immediately. With 2 languages the language is a switch; from the
// third (Marathi) it becomes a dropdown.

import React from 'react';
import {Pressable, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import type {Lang} from '@/brand';
import {LANGUAGES, setLanguage, useI18n} from '@/i18n';
import {useUpdates} from '@/features/app/updates';
import {useCan} from '@/features/auth/SessionProvider';
import {makeStyles, palettes, useThemeSettings, type ModeSetting, type PaletteId} from '@/theme';
import {Card, Icon, OptionRow, Screen, Section, SegmentedControl, SelectField, Text} from '@/ui';
import type {AppStackParamList} from '@/navigation/types';

export default function SettingsScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {theme, modeSetting, setModeSetting, setPalette, allowedPalettes} = useThemeSettings();
  const {currentVersion, update} = useUpdates();
  const can = useCan();

  return (
    <Screen header={{title: t('settings.title')}} scroll>
      <Section title={t('settings.appearance')}>
        <Card>
          <Text variant="label" color="muted" style={s.label}>
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
          <Text variant="label" color="muted" style={[s.label, s.gap]}>
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
          <Text variant="label" color="muted" style={[s.label, s.gap]}>
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
        <Card padded={false}>
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
        <Card padded={false}>
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
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{selected}}
      accessibilityLabel={label}
      style={[s.swatch, selected && {borderColor: accent.primary}]}>
      <View style={[s.dot, {backgroundColor: accent.primary}]}>
        {selected ? <Icon name="check" size={16} color={accent.onPrimary} /> : null}
      </View>
      <View style={[s.dot2, {backgroundColor: accent.primary2}]} />
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(t => ({
  label: {marginBottom: t.space.sm},
  gap: {marginTop: t.space.lg},
  swatches: {flexDirection: 'row', gap: t.space.sm, flexWrap: 'wrap'},
  swatch: {
    width: 72,
    alignItems: 'center',
    paddingVertical: t.space.sm,
    borderRadius: t.radius.md,
    borderWidth: 2,
    borderColor: t.colors.border,
    gap: t.space.xs,
  },
  dot: {width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  dot2: {
    position: 'absolute',
    top: 26,
    right: 18,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: t.colors.surface,
  },
}));
