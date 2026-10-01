// W7: sections rise in one after another when a screen first shows
// (index 0, 1, 2 …). Only runs on mount, so going back to a screen or
// refreshing it never replays it. Respects the system "remove animations"
// setting.

import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';

const STEP_MS = 50;
const MAX_STEPS = 6;

export function Appear({
  index = 0,
  style,
  children,
}: {
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, MAX_STEPS) * STEP_MS)
        .duration(320)
        .springify()
        .damping(20)
        .stiffness(180)}
      style={style}>
      {children}
    </Animated.View>
  );
}
