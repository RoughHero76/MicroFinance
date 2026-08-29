// StatusBadge — the single place that maps any status string to a tone and
// renders a pill. Replace the per-screen status-color logic with this.
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { radii, spacing, type, getStatusTone, tones } from '../../theme/tokens';

const StatusBadge = ({ label, status, style }) => {
  const key = status ?? label;
  const tone = getStatusTone(key);
  const t = tones[tone];
  return (
    <Text
      style={[
        styles.badge,
        { color: t.fg, backgroundColor: t.bg },
        style,
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {String(key).replace(/[_-]/g, ' ')}
    </Text>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.pill,
    fontSize: type.sizes.xs,
    fontWeight: type.weights.semibold,
    letterSpacing: 0.2,
    overflow: 'hidden',
  },
});

export default StatusBadge;
