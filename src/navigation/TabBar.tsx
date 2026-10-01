// W7: the mock's floating tab bar. A rounded card inset from the screen
// edges with a soft shadow; a tinted pill slides behind the active tab and
// its icon springs up a little.

import React, {useEffect, useState} from 'react';
import {Keyboard, Pressable, View, type LayoutChangeEvent} from 'react-native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import Animated, {useAnimatedStyle, useSharedValue, withSpring, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {haptics} from '@/lib/haptics';
import {makeStyles, useTheme} from '@/theme';
import {Text} from '@/ui';

const SPRING = {damping: 18, stiffness: 220, mass: 0.7};

export function FloatingTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const tabWidth = width / Math.max(count, 1);
  const x = useSharedValue(0);

  useEffect(() => {
    if (tabWidth) {
      x.value = withSpring(state.index * tabWidth, SPRING);
    }
  }, [state.index, tabWidth, x]);

  const indicator = useAnimatedStyle(() => ({transform: [{translateX: x.value}]}));
  const keyboard = useKeyboardVisible();

  // Hidden while typing (tabBarHideOnKeyboard) and on screens that ask for it.
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  const hidden = (focusedOptions.tabBarStyle as {display?: string} | undefined)?.display === 'none';
  if (hidden || keyboard) {
    return null;
  }

  return (
    <View style={[s.outer, {paddingBottom: Math.max(insets.bottom, 8)}]} pointerEvents="box-none">
      <View style={s.bar} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {tabWidth ? (
          <Animated.View style={[s.indicatorSlot, {width: tabWidth}, indicator]} pointerEvents="none">
            <View style={s.indicator} />
          </Animated.View>
        ) : null}
        {state.routes.map((route, index) => {
          const {options} = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
          const color = focused ? t.colors.primary : t.colors.muted;
          const onPress = () => {
            const event = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true});
            if (!focused && !event.defaultPrevented) {
              haptics.tap();
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <TabItem
              key={route.key}
              focused={focused}
              label={label}
              badge={options.tabBarBadge}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              icon={options.tabBarIcon?.({focused, color, size: 22})}
              onPress={onPress}
              onLongPress={() => navigation.emit({type: 'tabLongPress', target: route.key})}
            />
          );
        })}
      </View>
    </View>
  );
}

// A custom tabBar replaces the default one that implemented
// tabBarHideOnKeyboard, so the bar hides itself while typing.
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

function TabItem({
  focused,
  label,
  badge,
  icon,
  accessibilityLabel,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  label: string;
  badge?: string | number;
  icon: React.ReactNode;
  accessibilityLabel?: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const s = useStyles();
  const lift = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    lift.value = focused ? withSpring(1, SPRING) : withTiming(0, {duration: 160});
  }, [focused, lift]);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{translateY: -1.5 * lift.value}, {scale: 1 + 0.08 * lift.value}],
  }));
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{selected: focused}}
      accessibilityLabel={accessibilityLabel ?? label}
      style={s.item}>
      <Animated.View style={iconStyle}>
        {icon}
        {badge !== undefined ? (
          <View style={s.badge}>
            <Text variant="caption" weight="bold" style={s.badgeText}>
              {badge}
            </Text>
          </View>
        ) : null}
      </Animated.View>
      <Text
        weight={focused ? 'bold' : 'semibold'}
        color={focused ? 'primary' : 'muted'}
        numberOfLines={1}
        style={s.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(t => ({
  outer: {backgroundColor: t.colors.bg, paddingHorizontal: 10, paddingTop: 4},
  bar: {
    flexDirection: 'row',
    height: 62,
    borderRadius: 22,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...t.shadow.float,
  },
  indicatorSlot: {position: 'absolute', top: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center'},
  indicator: {width: '78%', height: 50, borderRadius: 16, backgroundColor: t.colors.primarySoft},
  item: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2},
  label: {fontSize: 10.5, lineHeight: 14},
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: t.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: t.colors.surface,
  },
  badgeText: {color: t.colors.white, fontSize: 10, lineHeight: 12},
}));
