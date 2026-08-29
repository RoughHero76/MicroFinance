import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, type, shadow } from '../tokens';
import Card from './Card';
import Icon from '../Icon';

const TONES = {
  accent: { bg: colors.accentSoft, fg: colors.accentDeep },
  primary: { bg: colors.neutralSoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.successInk },
  danger: { bg: colors.dangerSoft, fg: colors.dangerInk },
  info: { bg: colors.infoSoft, fg: colors.infoInk },
  warning: { bg: colors.warningSoft, fg: colors.warningInk },
};

/**
 * StatCard
 * --------
 * Dashboard metric tile: icon, label, big value, optional delta line.
 *
 *   <StatCard icon="bank" label="Active Loans" value={n} tone="accent" delta="+12%" />
 */
const StatCard = ({
  icon = 'chart-bar',
  label,
  value,
  tone = 'primary',
  delta,
  deltaUp = true,
  onPress,
  style,
}) => {
  const t = TONES[tone] || TONES.primary;

  return (
    <Card tone="surface" padded={false} onPress={onPress} style={style}>
      <View style={styles.inner}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: radius.md,
            backgroundColor: t.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={22} color={t.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[type.caption, { color: colors.inkMuted }]}>{label}</Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 4, letterSpacing: 0.2 },
            ]}
          >
            {value ?? '—'}
          </Text>
          {delta ? (
            <Text
              style={[
                type.micro,
                { color: deltaUp ? colors.success : colors.danger, marginTop: 2 },
              ]}
            >
              {deltaUp ? '▲' : '▼'} {delta}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
});

export default StatCard;
