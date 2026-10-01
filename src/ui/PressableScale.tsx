// W7: the one press feel for cards, buttons and tiles. It sinks slightly
// on press and springs back on release, running on the UI thread so it
// stays smooth while JS is busy.

import React, {forwardRef} from 'react';
import {Pressable, type PressableProps, type StyleProp, type View, type ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withSpring, withTiming} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Scale while pressed; 0.97 for cards, 0.94 for small controls. */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  {scaleTo = 0.97, style, onPressIn, onPressOut, children, ...rest},
  ref,
) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{scale: 1 - (1 - scaleTo) * pressed.value}],
    opacity: 1 - 0.08 * pressed.value,
  }));
  return (
    <AnimatedPressable
      ref={ref}
      {...rest}
      onPressIn={e => {
        pressed.value = withTiming(1, {duration: 90});
        onPressIn?.(e);
      }}
      onPressOut={e => {
        pressed.value = withSpring(0, {damping: 15, stiffness: 280, mass: 0.6});
        onPressOut?.(e);
      }}
      style={[style, animated]}>
      {children}
    </AnimatedPressable>
  );
});
