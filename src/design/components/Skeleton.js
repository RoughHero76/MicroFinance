import React, { useEffect } from 'react';
import { View, Animated, StyleSheet, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '../tokens';

const makeShimmer = () => {
  const value = new Animated.Value(0);
  const animation = Animated.loop(
    Animated.timing(value, {
      toValue: 1,
      duration: 1200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    })
  );
  return { value, animation };
};

/**
 * Skeleton
 * --------
 * Shimmer placeholder block for loading states.
 *
 *   <Skeleton width="100%" height={64} radius={14} />
 *   <SkeletonCircle size={44} />
 */
const Skeleton = ({
  width = '100%',
  height = 16,
  radius: r = radius.sm,
  style,
}) => {
  const { value, animation } = makeShimmer();
  useEffect(() => {
    animation.start();
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opacity = value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: r,
          backgroundColor: colors.inkFaint,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * SkeletonCircle — round avatar/placeholder shimmer.
 */
const SkeletonCircle = ({ size = 44, style }) => (
  <Skeleton width={size} height={size} radius={size / 2} style={style} />
);

export { SkeletonCircle };
export default Skeleton;
