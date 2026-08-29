// StatCard — a compact metric tile for home dashboards.
// <StatCard label="Active Loans" value={12} icon="chart-line" tone="brand" trend="+8%" />
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from 'react-native-vector-icons';
import EviCard from './EviCard';
import { tokens, tones } from '../../theme/tokens';

const { spacing, type, radii, colors } = tokens;

const StatCard = ({ label, value, icon, tone = 'brand', trend, trendUp = true }) => {
  const t = tones[tone] || tones.brand;
  return (
    <EviCard style={styles.card} elevated={false}>
      <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
        <MaterialCommunityIcons name={icon || 'chart-line'} size={20} color={t.fg} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.value}>{value ?? '—'}</Text>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {trend ? (
          <Text style={[styles.trend, { color: trendUp ? colors.success : colors.danger }]}>
            {trendUp ? '↑ ' : '↓ '}
            {trend}
          </Text>
        ) : null}
      </View>
    </EviCard>
  );
};

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radii.lg },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  textCol: { flex: 1 },
  value: {
    fontSize: type.sizes.xl,
    fontWeight: type.weights.bold,
    color: colors.ink,
    lineHeight: 24,
  },
  label: {
    fontSize: type.sizes.xs,
    color: colors.inkSoft,
    marginTop: 2,
  },
  trend: {
    fontSize: type.sizes.xs,
    fontWeight: type.weights.semibold,
    marginTop: 4,
  },
});

export default StatCard;
