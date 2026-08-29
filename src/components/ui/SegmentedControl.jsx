// SegmentedControl — a simple pill-style segmented toggle (All | Active | Overdue …)
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../theme/tokens';

const { colors, spacing, radii, type } = tokens;

const SegmentedControl = ({ options, value, onChange, style }) => (
  <View style={[styles.track, style]}>
    {options.map((opt) => {
      const label = typeof opt === 'string' ? opt : opt.label;
      const key = typeof opt === 'string' ? opt : opt.value;
      const active = key === value;
      return (
        <Pressable
          key={key}
          onPress={() => onChange(key)}
          style={[styles.segment, active && styles.segmentActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
        >
          <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: 3,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
  segmentActive: { backgroundColor: colors.card },
  label: {
    fontSize: type.sizes.sm,
    fontWeight: type.weights.medium,
    color: colors.inkSoft,
  },
  labelActive: { color: colors.brand, fontWeight: type.weights.semibold },
});

export default SegmentedControl;
