import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles, useTheme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface IconButtonProps {
  icon: string;
  /** Required: read by screen readers (U-12). */
  label: string;
  onPress?: () => void;
  variant?: 'tonal' | 'plain' | 'filled';
  size?: number;
  color?: string;
  badge?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Round 36dp button (call, SMS, WhatsApp, header actions) with a 48dp tap area. */
export function IconButton({ icon, label, onPress, variant = 'tonal', size = 36, color, badge, disabled, style, testID }: IconButtonProps) {
  const t = useTheme();
  const s = useStyles();
  const fg = color ?? (variant === 'filled' ? t.colors.onPrimary : variant === 'tonal' ? t.colors.primary : t.colors.text);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={(48 - size) / 2}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [
        s.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'tonal' && s.tonal,
        variant === 'filled' && s.filled,
        pressed && s.pressed,
        disabled && s.disabled,
        style,
      ]}>
      <Icon name={icon} size={Math.round(size * 0.55)} color={fg} />
      {badge ? (
        <View style={s.badge}>
          <Text variant="caption" weight="bold" style={s.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles(t => ({
  base: { alignItems: 'center', justifyContent: 'center' },
  tonal: { backgroundColor: t.colors.primarySoft },
  filled: { backgroundColor: t.colors.primary },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: t.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: t.colors.surface,
  },
  badgeText: { color: t.colors.white, fontSize: 10, lineHeight: 12 },
}));
