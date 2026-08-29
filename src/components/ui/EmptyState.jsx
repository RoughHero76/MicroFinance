// EmptyState — friendly, consistent placeholder when a list has no rows.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from 'react-native-vector-icons';
import { colors, spacing, type, tones } from '../../theme/tokens';
import EviButton from './EviButton';

const EmptyState = ({ icon = 'inbox-outline', title = 'Nothing here yet', message, actionLabel, onAction, tone = 'neutral', style }) => {
  const t = tones[tone] || tones.neutral;
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.iconRing, { backgroundColor: t.bg }]}>
        <MaterialCommunityIcons name={icon} size={30} color={t.fg} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel ? (
        <EviButton title={actionLabel} onPress={onAction} variant="secondary" size="md" style={styles.action} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.semibold,
    color: colors.ink,
    textAlign: 'center',
  },
  message: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  action: { marginTop: spacing.lg },
});

export default EmptyState;
