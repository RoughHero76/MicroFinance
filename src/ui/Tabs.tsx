// UnderlineTabs (at most 3, U-16) and SegmentedControl (Grouped/All,
// Light/Dark/System).

import React from 'react';
import {Pressable, View, type StyleProp, type ViewStyle} from 'react-native';
import {makeStyles} from '@/theme';
import {Text} from './Text';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  badge?: number;
}

interface Props<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function UnderlineTabs<T extends string>({options, value, onChange, style}: Props<T>) {
  const s = useStyles();
  return (
    <View style={[s.tabs, style]} accessibilityRole="tablist">
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{selected}}
            style={s.tab}>
            <Text
              variant="label"
              weight={selected ? 'semibold' : 'medium'}
              color={selected ? 'primary' : 'muted'}
              numberOfLines={1}>
              {option.label}
              {option.badge ? (
                <Text variant="caption" color={selected ? 'primary' : 'muted'}>{`  ${option.badge}`}</Text>
              ) : null}
            </Text>
            <View style={[s.underline, selected && s.underlineOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function SegmentedControl<T extends string>({options, value, onChange, style}: Props<T>) {
  const s = useStyles();
  return (
    <View style={[s.segmented, style]} accessibilityRole="radiogroup">
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{selected}}
            style={[s.segment, selected && s.segmentOn]}>
            <Text
              variant="small"
              weight={selected ? 'semibold' : 'medium'}
              color={selected ? 'text' : 'muted'}
              numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(t => ({
  tabs: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.colors.border, paddingHorizontal: t.space.sm},
  tab: {flex: 1, alignItems: 'center', paddingTop: t.space.md, minHeight: t.size.tap},
  underline: {marginTop: t.space.sm, height: 3, width: '60%', borderRadius: 2, backgroundColor: 'transparent'},
  underlineOn: {backgroundColor: t.colors.primary},
  segmented: {flexDirection: 'row', padding: 3, borderRadius: t.radius.pill, backgroundColor: t.colors.surface2},
  segment: {
    flex: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.pill,
    paddingHorizontal: t.space.md,
  },
  segmentOn: {backgroundColor: t.colors.surface, elevation: 1},
}));
