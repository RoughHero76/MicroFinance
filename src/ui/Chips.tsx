// U-16: filter chips that scroll sideways, with a fade at the edge so small
// screens never overflow. Counts live in the chip label ("Pending 12").

import React from 'react';
import {ScrollView, View, type StyleProp, type ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {makeStyles, useTheme, withAlpha} from '@/theme';
import {PressableScale} from './PressableScale';
import {Text} from './Text';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export interface ChipsProps<T extends string> {
  options: ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Wrap onto several lines instead of scrolling (short option lists in forms). */
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
  trailing?: React.ReactNode;
  /** Colour behind the row, for the edge fade (defaults to the screen background). */
  fadeColor?: string;
}

export function Chips<T extends string>({options, value, onChange, wrap, style, trailing, fadeColor}: ChipsProps<T>) {
  const t = useTheme();
  const s = useStyles();
  const fade = fadeColor ?? t.colors.bg;
  const chips = options.map(option => {
    const selected = option.value === value;
    return (
      <PressableScale
        key={option.value}
        scaleTo={0.94}
        onPress={() => onChange(option.value)}
        hitSlop={{top: 6, bottom: 6}}
        accessibilityRole="button"
        accessibilityState={{selected}}
        style={[s.chip, selected && s.selected]}>
        <Text
          variant="small"
          weight={selected ? 'semibold' : 'medium'}
          color={selected ? 'primary' : 'text'}
          numberOfLines={1}>
          {option.label}
          {option.count != null ? (
            <Text variant="small" color={selected ? 'primary' : 'muted'}>{`  ${option.count}`}</Text>
          ) : null}
        </Text>
      </PressableScale>
    );
  });

  if (wrap) {
    return (
      <View style={[s.wrap, style]} accessibilityRole="radiogroup">
        {chips}
        {trailing}
      </View>
    );
  }
  return (
    <View style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
        accessibilityRole="radiogroup">
        {chips}
        {trailing}
      </ScrollView>
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(fade, 0), fade]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={s.fade}
      />
    </View>
  );
}

const useStyles = makeStyles(t => ({
  row: {gap: t.space.sm, paddingHorizontal: t.space.lg, paddingVertical: t.space.xs},
  wrap: {flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm},
  chip: {
    height: 34,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The mock's selected chip is tinted, not solid.
  selected: {backgroundColor: t.colors.primarySoft, borderColor: t.colors.primary},
  fade: {position: 'absolute', right: 0, top: 0, bottom: 0, width: 24},
}));
