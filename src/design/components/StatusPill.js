import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, type } from '../tokens';
import { statusTheme } from '../tokens';

/**
 * StatusPill
 * ----------
 * Maps a status string (loan, repayment, lead, etc.) to a semantic pill using
 * the shared `statusTheme` helper.
 *
 *   <StatusPill status="Active" />
 *   <StatusPill status="NPA" dot />
 */
const StatusPill = ({ status, dot = true, style }) => {
  const t = statusTheme(status);
  const label = t.label && t.label !== '—' ? t.label : String(status || '—');

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: t.bg,
          borderRadius: radius.full,
          paddingVertical: 4,
          paddingHorizontal: spacing.sm,
        },
        style,
      ]}
    >
      {dot ? (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: t.color,
            marginRight: 6,
          }}
        />
      ) : null}
      <Text numberOfLines={1} style={[type.caption, { color: t.color }]}>
        {label}
      </Text>
    </View>
  );
};

export default StatusPill;
