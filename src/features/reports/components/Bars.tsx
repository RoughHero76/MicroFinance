// Horizontal bars for the report distributions (A17): label, bar, count.
// Replaces the old pie and bar charts, which overflowed on small screens.

import React, {useEffect} from 'react';
import {View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming} from 'react-native-reanimated';
import {makeStyles, useTheme} from '@/theme';
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
            <Bar fraction={item.value / max} index={items.indexOf(item)} />
          </View>
          <Text variant="small" weight="semibold" style={s.value}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// W7: each bar grows from the left in the brand gradient (mock A17).
function Bar({fraction, index}: {fraction: number; index: number}) {
  const t = useTheme();
  const s = useStyles();
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(index * 60, withTiming(fraction, {duration: 600, easing: Easing.out(Easing.cubic)}));
  }, [fraction, index, width]);
  const style = useAnimatedStyle(() => ({width: `${width.value * 100}%`}));
  return (
    <Animated.View style={[s.bar, style]}>
      <LinearGradient
        colors={[t.colors.primary, t.colors.primary2]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={s.fill}
      />
    </Animated.View>
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
  track: {flex: 1, height: 8, borderRadius: 4, backgroundColor: t.colors.surface2, overflow: 'hidden'},
  bar: {height: 8, borderRadius: 4, overflow: 'hidden'},
  fill: {flex: 1},
  value: {width: 32, textAlign: 'right'},
}));
