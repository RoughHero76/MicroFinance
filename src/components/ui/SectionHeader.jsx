// SectionHeader — consistent list-section heading with an optional action.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../theme/tokens';

const { spacing, type, colors } = tokens;

const SectionHeader = ({ title, actionLabel, onAction, style }) => (
  <View style={[styles.wrap, style]}>
    <Text style={styles.title}>{title}</Text>
    {actionLabel ? (
      <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
        <Text style={styles.action}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.semibold,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  action: {
    fontSize: type.sizes.sm,
    fontWeight: type.weights.semibold,
    color: colors.brand,
  },
});

export default SectionHeader;
