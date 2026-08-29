import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { colors, spacing, radius, type } from '../tokens';
import { usePressScale } from '../motion';
import Icon from '../Icon';

const TONES = {
  neutral: { bg: colors.neutralSoft, on: colors.neutralInk, border: 'transparent' },
  accent: { bg: colors.accentSoft, on: colors.accentDeep, border: 'transparent' },
  success: { bg: colors.successSoft, on: colors.successInk, border: 'transparent' },
  danger: { bg: colors.dangerSoft, on: colors.dangerInk, border: 'transparent' },
  warning: { bg: colors.warningSoft, on: colors.warningInk, border: 'transparent' },
  info: { bg: colors.infoSoft, on: colors.infoInk, border: 'transparent' },
  outline: { bg: 'transparent', on: colors.inkSecondary, border: colors.borderStrong },
};

/**
 * Chip
 * ----
 * Small rounded pill for filters, tags and status. Pass `selected` for an active
 * look, `onPress` to make it tappable, `icon` for a leading glyph, `onClose`
 * for a dismiss X.
 *
 *   <Chip label="Active" tone="success" icon="check" />
 *   <Chip label="Filter" selected onPress={...} />
 */
const Chip = ({
  label,
  tone = 'neutral',
  selected = false,
  icon,
  onPress,
  onClose,
  style,
}) => {
  const t = TONES[tone] || TONES.neutral;
  const [press, pressHandlers] = usePressScale(onPress ? 0.94 : 1);

  const bg = selected ? colors.primary : t.bg;
  const on = selected ? colors.onPrimary : t.on;
  const border = selected ? colors.primary : t.border;

  const content = (
    <View
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
        },
        press,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={14} color={on} style={{ marginRight: 6 }} /> : null}
      <Text style={[type.bodyBold, { color: on }]} numberOfLines={1}>
        {label}
      </Text>
      {onClose ? (
        <Pressable hitSlop={8} onPress={onClose} style={{ marginLeft: 4 }}>
          <Icon name="close" size={14} color={on} />
        </Pressable>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} {...pressHandlers}>
        {content}
      </Pressable>
    );
  }
  return content;
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    borderWidth: 1,
    maxWidth: '100%',
  },
});

export default Chip;
