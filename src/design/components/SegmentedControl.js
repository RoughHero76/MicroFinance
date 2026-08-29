import React from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, radius, type } from '../tokens';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * SegmentedControl
 * ----------------
 * Animated tab strip with a sliding indicator.
 *
 *   <SegmentedControl
 *     options={['All', 'Active', 'Closed']}
 *     value="Active"
 *     onChange={(v) => setTab(v)}
 *   />
 *
 * `options` may be strings or { label, value } objects.
 */
const SegmentedControl = ({
  options,
  value,
  onChange,
  style,
}) => {
  const opts = options.map((o) =>
    typeof o === 'string' ? { label: o, value: o } : o
  );
  const index = Math.max(
    0,
    opts.findIndex((o) => o.value === value)
  );
  const count = opts.length || 1;

  const indicator = React.useRef(new Animated.Value(index)).current;
  React.useEffect(() => {
    Animated.timing(indicator, {
      toValue: index,
      duration: 220,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const segW = (SCREEN_W - spacing.md * 2 - spacing.xxs) / count;
  const translateX = indicator.interpolate({
    inputRange: [0, count - 1],
    outputRange: [0, (count - 1) * segW],
  });

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.inkFaint,
          borderRadius: radius.full,
          padding: spacing.xxs,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          {
            width: segW,
            transform: [{ translateX }],
          },
        ]}
      />
      {opts.map((o, i) => {
        const active = i === index;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.seg, { width: segW, marginRight: i < count - 1 ? spacing.xxs : 0 }]}
            onPress={() => onChange && onChange(o.value)}
          >
            <Text
              numberOfLines={1}
              style={[
                type.bodyBold,
                { color: active ? colors.onPrimary : colors.inkSecondary },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  seg: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  indicator: {
    position: 'absolute',
    top: spacing.xxs,
    left: 0,
    height: 36,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
});

export default SegmentedControl;
