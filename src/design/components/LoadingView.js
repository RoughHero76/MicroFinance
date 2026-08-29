import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, type } from '../tokens';
import { FadeIn } from '../motion';

/**
 * LoadingView
 * -----------
 * Centered spinner + optional label. Full-screen or inline via `absolute`.
 */
const LoadingView = ({ label, color = colors.primary, absolute = true, style }) => {
  return (
    <FadeIn
      style={[
        absolute && styles.absolute,
        styles.wrap,
        style,
      ]}
    >
      <ActivityIndicator size="large" color={color} />
      {label ? (
        <Text style={[type.body, { color: colors.inkSecondary, marginTop: spacing.sm }]}>
          {label}
        </Text>
      ) : null}
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  absolute: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
});

export default LoadingView;
