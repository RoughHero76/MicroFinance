// EviProgress — a deterministic (purely view) progress bar.
// progress must already be computed by the caller (0–100).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens, tones } from '../../theme/tokens';

const { colors, radii, type } = tokens;

const EviProgress = ({ value = 0, label, tone, style, showLabel = true }) => {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const barColor = tone ? (tones[tone]?.fg || colors.brand) : pct >= 99 ? colors.success : colors.brand;

  return (
    <View style={style}>
      {showLabel && label ? (
        <View style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.pct}>{Math.round(pct)}%</Text>
        </View>
      ) : null}
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: type.sizes.sm, color: colors.inkSoft, fontWeight: type.weights.medium },
  pct: { fontSize: type.sizes.sm, color: colors.ink, fontWeight: type.weights.semibold },
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.line, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: radii.pill },
});

export default EviProgress;
