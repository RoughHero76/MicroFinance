// W7: shared FlatList settings. Render a screenful first, then fill in small
// batches, and let Android drop rows that are far off screen. Spread into
// every long list: <FlatList {...listProps} … />.

import {Platform} from 'react-native';

export const listProps = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 40,
  windowSize: 9,
  removeClippedSubviews: Platform.OS === 'android',
} as const;
