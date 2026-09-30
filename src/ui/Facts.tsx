// KeyValueRows (U-18: details as label/value rows; empty values hide their
// row) and FactTiles (U-17: at most 3 figures in a row, 12px padding).

import React from 'react';
import {Pressable, View, type StyleProp, type ViewStyle} from 'react-native';
import {makeStyles} from '@/theme';
import {Icon} from './Icon';
import {Text, type TextColor} from './Text';

export interface KeyValue {
  label: string;
  value?: React.ReactNode;
  valueColor?: TextColor;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Keep the row even when the value is empty. */
  keepEmpty?: boolean;
}

export function KeyValueRows({rows, style, dense}: {rows: KeyValue[]; style?: StyleProp<ViewStyle>; dense?: boolean}) {
  const s = useStyles();
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
        return row.onPress || row.onLongPress ? (
          <Pressable
            key={`${row.label}-${i}`}
            onPress={row.onPress}
            onLongPress={row.onLongPress}
            accessibilityRole={row.onPress ? 'button' : undefined}
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

export function ProgressBar({
  value,
  tone = 'primary',
  style,
}: {
  value: number;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles();
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View
      style={[s.track, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{min: 0, max: 100, now: Math.round(pct * 100)}}>
      <View style={[s.fill, s[tone], {width: `${pct * 100}%`}]} />
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
}));
