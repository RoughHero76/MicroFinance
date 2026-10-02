// Pull-to-refresh in the brand colour, on a surface-coloured disc (W7).

import React from 'react';
import {RefreshControl as RNRefreshControl, type RefreshControlProps} from 'react-native';
import {useTheme} from '@/theme';

export function RefreshControl(props: RefreshControlProps) {
  const t = useTheme();
  return (
    <RNRefreshControl
      colors={[t.colors.primary]}
      tintColor={t.colors.primary}
      progressBackgroundColor={t.colors.surface}
      {...props}
    />
  );
}
