// Skeleton — simple shimmer-free placeholder blocks for loading lists.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { tokens } from '../../theme/tokens';

const { colors, radii } = tokens;

const Skeleton = ({ width, height = 12, radius, style }) => {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width: width || '100%',
          height,
          borderRadius: radius ?? radii.sm,
          opacity,
        },
        style,
      ]}
    />
  );
};

// SkeletonList — a ready-made loading list (3 cards) to drop into any screen.
export const SkeletonList = ({ count = 3, style }) => (
  <View style={style}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.row}>
        <Skeleton width={44} height={44} radius={22} />
        <View style={{ flex: 1 }}>
          <Skeleton height={14} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={12} />
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  block: { backgroundColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, backgroundColor: colors.card, borderRadius: 16, marginBottom: 12 },
});

export default Skeleton;
