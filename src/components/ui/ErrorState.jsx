// ErrorState — consistent failure placeholder with an optional retry action.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from 'react-native-vector-icons';
import { tokens, tones } from '../../theme/tokens';
import EviButton from './EviButton';

const { spacing, type, colors } = tokens;

const ErrorState = ({ message = 'Something went wrong. Please try again.', retryLabel = 'Try again', onRetry, style }) => (
  <View style={[styles.wrap, style]}>
    <View style={[styles.iconRing, { backgroundColor: tones.danger.bg }]}>
      <MaterialCommunityIcons name="alert-circle-outline" size={30} color={tones.danger.fg} />
    </View>
    <Text style={styles.title}>Unable to load</Text>
    <Text style={styles.message}>{message}</Text>
    {onRetry ? <EviButton title={retryLabel} onPress={onRetry} variant="secondary" size="md" style={styles.action} /> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl * 2, paddingHorizontal: spacing.lg },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: type.sizes.lg, fontWeight: type.weights.semibold, color: colors.ink },
  message: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  action: { marginTop: spacing.lg },
});

export default ErrorState;
