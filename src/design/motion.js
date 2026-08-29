import React, { useEffect } from 'react';
import { Animated, View } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { motion } from './tokens';

/**
 * usePressScale
 * --------------
 * Returns [animatedStyle, handlers] that shrink a view slightly on press,
 * giving tactile, springy feedback. Spread the handlers onto a Pressable/View.
 *
 *   const [press, pressHandlers] = usePressScale();
 *   <View style={press} {...pressHandlers}>...</View>
 */
export const usePressScale = (scale = 0.97) => {
  const s = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
  }));
  const handlers = {
    onPressIn: () => {
      s.value = withSpring(scale, motion.spring);
    },
    onPressOut: () => {
      s.value = withSpring(1, motion.spring);
    },
  };
  return [animatedStyle, handlers];
};

/**
 * FadeInUp
 * ---------
 * Entrance animation: fades in while sliding up. Use `delay` to stagger
 * lists (delay = index * motion.staggerStep).
 */
export const FadeInUp = ({ delay = 0, children, style, as: Comp = View, ...rest }) => {
  const translate = useSharedValue(14);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: motion.duration, delay })
    );
    translate.value = withTiming(0, { duration: motion.durationSlow, delay });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translate.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  );
};

/**
 * FadeIn — simple opacity entrance.
 */
export const FadeIn = ({ delay = 0, children, style, ...rest }) => {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: motion.duration, delay });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  );
};

/**
 * PopIn — spring scale + fade, used for sheets, modals and toasts.
 */
export const PopIn = ({ children, style, ...rest }) => {
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, motion.spring);
    opacity.value = withTiming(1, { duration: motion.durationFast });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View style={[animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  );
};
