// Screen-width steps for the web layout. The phone layout is used below
// `wide`; between `wide` and `split` the sidebar appears; above `split`,
// lists and their details sit side by side.

import {useWindowDimensions} from 'react-native';

export const WIDE = 1024;
export const SPLIT = 1180;

export function useBreakpoint() {
  const {width} = useWindowDimensions();
  return {width, wide: width >= WIDE, split: width >= SPLIT};
}
