// Horizontal bars for the report distributions (A17): label, bar, count.
// Replaces the old pie and bar charts, which overflowed on small screens.

import React from 'react';
import {View} from 'react-native';
import {makeStyles} from '@/theme';
import {Text} from '@/ui';

export interface BarItem {
  label: string;
  value: number;
}

export function Bars({items}: {items: BarItem[]}) {
  const s = useStyles();
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <View style={s.wrap} accessibilityRole="summary">
      {items.map(item => (
        <View key={item.label} style={s.row} accessible accessibilityLabel={`${item.label}: ${item.value}`}>
          <Text variant="small" color="muted" style={s.label} numberOfLines={1}>
            {item.label}
          </Text>
          <View style={s.track}>
            <View style={[s.bar, {width: `${(item.value / max) * 100}%`}]} />
          </View>
          <Text variant="small" weight="semibold" style={s.value}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** "10000-19999" → "₹10k–20k"; the first bucket reads "<₹10k". */
export function rangeLabel(range: string, step: number): string {
  const low = parseInt(range, 10) || 0;
  const k = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));
  if (low === 0) return `<₹${k(step)}`;
  return `₹${k(low)}–${k(low + step)}`;
}

const useStyles = makeStyles(t => ({
  wrap: {gap: t.space.sm},
  row: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  label: {width: 84},
  track: {flex: 1, height: 12, borderRadius: 6, backgroundColor: t.colors.surface2, overflow: 'hidden'},
  bar: {height: 12, borderRadius: 6, backgroundColor: t.colors.primary},
  value: {width: 32, textAlign: 'right'},
}));
