// KeyValueRows (U-18: details as label/value rows; empty values hide their
// row) and FactTiles (U-17: at most 3 figures in a row, 12px padding).

import React, {useEffect} from 'react';
import {Pressable, View, type StyleProp, type ViewStyle} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTranslation} from 'react-i18next';
import {haptics} from '@/lib/haptics';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {makeStyles, withAlpha} from '@/theme';
import {Card} from './Card';
import {CountUp} from './Hero';
import {Icon} from './Icon';
import {Text, type TextColor} from './Text';
import {toast} from './Toast';

export interface KeyValue {
  label: string;
  value?: React.ReactNode;
  valueColor?: TextColor;
  onPress?: () => void;
  onLongPress?: () => void;
  /** P-07: long-press copies this (true copies the value itself). */
  copy?: string | boolean;
  /** Keep the row even when the value is empty. */
  keepEmpty?: boolean;
}

export function KeyValueRows({rows, style, dense}: {rows: KeyValue[]; style?: StyleProp<ViewStyle>; dense?: boolean}) {
  const s = useStyles();
  const {t} = useTranslation();
  const visible = rows.filter(r => r.keepEmpty || (r.value !== undefined && r.value !== null && r.value !== ''));
  return (
    <View style={style}>
      {visible.map((row, i) => {
        const content = (
          <>
            <Text variant="small" color="muted" style={s.key}>
              {row.label}
            </Text>
            <View style={s.valueBox}>
              {typeof row.value === 'string' || typeof row.value === 'number' ? (
                <Text variant="small" weight="medium" color={row.valueColor ?? 'text'} align="right" tabular>
                  {row.value}
                </Text>
              ) : (
                row.value
              )}
            </View>
            {row.onPress ? <Icon name="chevron-right" size={18} color="muted" /> : null}
          </>
        );
        const rowStyle = [s.row, dense && s.dense, i > 0 && s.border];
        const copyText = row.copy === true ? String(row.value ?? '') : row.copy || '';
        const onLongPress = copyText
          ? () => {
              Clipboard.setString(copyText);
              haptics.tap();
              toast.info(t('common.copiedValue', {value: copyText}));
            }
          : row.onLongPress;
        return row.onPress || onLongPress ? (
          <Pressable
            key={`${row.label}-${i}`}
            onPress={row.onPress}
            onLongPress={onLongPress}
            accessibilityRole={row.onPress ? 'button' : undefined}
            accessibilityHint={copyText ? t('ui.longPressToCopy') : undefined}
            style={({pressed}) => [...rowStyle, pressed && s.pressed]}>
            {content}
          </Pressable>
        ) : (
          <View key={`${row.label}-${i}`} style={rowStyle}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

export interface Fact {
  label: string;
  value: string;
  color?: TextColor;
}

export function FactTiles({facts, style}: {facts: Fact[]; style?: StyleProp<ViewStyle>}) {
  const s = useStyles();
  return (
    <View style={[s.tiles, style]}>
      {facts.slice(0, 3).map(fact => (
        <View key={fact.label} style={s.tile}>
          <Text variant="overline" color="muted" numberOfLines={1}>
            {fact.label}
          </Text>
          <Text
            variant="title"
            weight="bold"
            color={fact.color ?? 'text'}
            tabular
            numberOfLines={1}
            adjustsFontSizeToFit>
            {fact.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * W7: headline totals as white cards, two per row (mock A17), each number
 * rolling up. Pass numbers with a formatter so they can animate.
 */
export function StatGrid({
  stats,
  style,
}: {
  stats: {label: string; value: number; format?: (n: number) => string; color?: TextColor}[];
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles();
  return (
    <View style={[s.grid, style]}>
      {stats.map(stat => (
        <Card key={stat.label} style={s.stat}>
          <Text variant="small" color="muted" numberOfLines={1}>
            {stat.label}
          </Text>
          <CountUp
            value={stat.value}
            format={stat.format}
            variant="h2"
            weight="bold"
            color={stat.color ?? 'text'}
            numberOfLines={1}
            adjustsFontSizeToFit
          />
        </Card>
      ))}
    </View>
  );
}

export function ProgressBar({
  value,
  tone = 'primary',
  onHero,
  style,
}: {
  value: number;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  /** White bar on a translucent track, for use on a HeroCard. */
  onHero?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles();
  const pct = Math.max(0, Math.min(1, value || 0));
  // W7: the bar grows to its value instead of appearing at it.
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(pct, {duration: 700, easing: Easing.out(Easing.cubic)});
  }, [pct, width]);
  const fill = useAnimatedStyle(() => ({width: `${width.value * 100}%`}));
  return (
    <View
      style={[s.track, onHero && s.heroTrack, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{min: 0, max: 100, now: Math.round(pct * 100)}}>
      <Animated.View style={[s.fill, onHero ? s.heroFill : s[tone], fill]} />
    </View>
  );
}

const useStyles = makeStyles(t => ({
  row: {flexDirection: 'row', alignItems: 'center', gap: t.space.md, minHeight: 44, paddingVertical: t.space.sm},
  dense: {minHeight: 32, paddingVertical: t.space.xs},
  border: {borderTopWidth: 1, borderTopColor: t.colors.border},
  pressed: {opacity: 0.7},
  key: {flexShrink: 0, maxWidth: '45%'},
  valueBox: {flex: 1, alignItems: 'flex-end'},
  tiles: {flexDirection: 'row', gap: 10},
  tile: {
    flex: 1,
    padding: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface2,
    gap: t.space.xs,
    minWidth: 0,
  },
  track: {height: 6, borderRadius: 3, backgroundColor: t.colors.surface2, overflow: 'hidden'},
  fill: {height: '100%', borderRadius: 3},
  primary: {backgroundColor: t.colors.primary},
  success: {backgroundColor: t.colors.success},
  warning: {backgroundColor: t.colors.warning},
  danger: {backgroundColor: t.colors.danger},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  stat: {flexBasis: '47%', flexGrow: 1, gap: t.space.xs, padding: t.space.md},
  heroTrack: {backgroundColor: withAlpha(t.colors.white, 0.25)},
  heroFill: {backgroundColor: t.colors.white},
}));
