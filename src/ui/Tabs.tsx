// UnderlineTabs (at most 3, U-16) and SegmentedControl (Grouped/All,
// Light/Dark/System).

import React, {useEffect, useRef, useState} from 'react';
import {Pressable, View, type LayoutChangeEvent, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {makeStyles} from '@/theme';
import {Text} from './Text';

const SPRING = {damping: 20, stiffness: 240, mass: 0.7};

// W7: the selected marker slides between options instead of jumping.
function useSlider(index: number, count: number) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const first = useRef(true);
  const segment = count ? width / count : 0;
  useEffect(() => {
    if (!segment) {
      return;
    }
    // Place it without animating the first time, then slide.
    x.value = first.current ? index * segment : withSpring(index * segment, SPRING);
    first.current = false;
  }, [index, segment, x]);
  const style = useAnimatedStyle(() => ({transform: [{translateX: x.value}]}));
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return {segment, style, onLayout};
}

function Slider({
  segment,
  style,
  children,
}: {
  segment: number;
  style: ReturnType<typeof useAnimatedStyle>;
  children: React.ReactNode;
}) {
  if (!segment) {
    return null;
  }
  return (
    <Animated.View pointerEvents="none" style={[sliderBase, {width: segment}, style]}>
      {children}
    </Animated.View>
  );
}
const sliderBase: ViewStyle = {position: 'absolute', top: 0, bottom: 0, left: 0, alignItems: 'center'};

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
  const slider = useSlider(
    Math.max(
      0,
      options.findIndex(o => o.value === value),
    ),
    options.length,
  );
  return (
    <View style={[s.tabs, style]} accessibilityRole="tablist">
      <View style={s.track} onLayout={slider.onLayout}>
        <Slider segment={slider.segment} style={slider.style}>
          <View style={s.underlineOn} />
        </Slider>
      </View>
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
          </Pressable>
        );
      })}
    </View>
  );
}

export function SegmentedControl<T extends string>({options, value, onChange, style}: Props<T>) {
  const s = useStyles();
  const slider = useSlider(
    Math.max(
      0,
      options.findIndex(o => o.value === value),
    ),
    options.length,
  );
  return (
    <View style={[s.segmented, style]} accessibilityRole="radiogroup">
      <View style={s.segTrack} onLayout={slider.onLayout}>
        <Slider segment={slider.segment} style={slider.style}>
          <View style={s.segmentOn} />
        </Slider>
      </View>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{selected}}
            style={s.segment}>
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
  // The track covers the tabs (inside the side padding) so the marker lines up.
  track: {position: 'absolute', left: t.space.sm, right: t.space.sm, bottom: -1, height: 3},
  tab: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: t.space.md, minHeight: t.size.tap},
  underlineOn: {height: 3, width: '60%', borderRadius: 2, backgroundColor: t.colors.primary},
  // Mock .segtab: a rounded rectangle, not a pill.
  segmented: {flexDirection: 'row', padding: 3, borderRadius: t.radius.md, backgroundColor: t.colors.surface2},
  segment: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: t.space.md,
  },
  segTrack: {position: 'absolute', top: 3, bottom: 3, left: 3, right: 3},
  segmentOn: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: 10,
    backgroundColor: t.colors.surface,
    ...t.shadow.raised,
    elevation: 2,
  },
}));
