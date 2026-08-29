import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../tokens';

/**
 * Divider — hairline separator with optional inset.
 */
const Divider = ({ style }) => (
  <View
    style={[
      {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.xs,
        marginHorizontal: spacing.md,
      },
      style,
    ]}
  />
);

export default Divider;
