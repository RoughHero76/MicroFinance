// W7: the first screenful of a list rises in, row after row, when the list
// first appears. Rows that render later (scrolling, load-more) appear
// instantly, so scrolling never waits on an animation.
//
//   const entering = useListEntrance();
//   <Animated.View entering={entering(index)}>…</Animated.View>

import {useCallback, useRef} from 'react';
import {FadeInDown} from 'react-native-reanimated';

const WINDOW_MS = 700;
const MAX_ROWS = 8;
const STEP_MS = 40;

export function useListEntrance() {
  const mountedAt = useRef(Date.now());
  return useCallback((index: number) => {
    if (index >= MAX_ROWS || Date.now() - mountedAt.current > WINDOW_MS) {
      return undefined;
    }
    return FadeInDown.delay(index * STEP_MS)
      .duration(280)
      .springify()
      .damping(20)
      .stiffness(190);
  }, []);
}
