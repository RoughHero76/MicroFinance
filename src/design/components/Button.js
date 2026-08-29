import React from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors, spacing, radius, type, shadow } from '../tokens';
import { usePressScale } from '../motion';
import Icon from '../Icon';

const VARIANTS = {
  primary: { bg: colors.primary, on: colors.onPrimary, pressed: colors.primaryPressed },
  accent: { bg: colors.accent, on: colors.accentInk, pressed: colors.accentDeep },
  outline: { bg: 'transparent', on: colors.primary, border: colors.borderStrong, pressed: colors.inkFaint },
  ghost: { bg: 'transparent', on: colors.primary, pressed: colors.inkFaint },
  danger: { bg: colors.danger, on: colors.white, pressed: '#BE123C' },
  subtle: { bg: colors.neutralSoft, on: colors.neutralInk, pressed: '#E2E8F0' },
};

const SIZES = {
  sm: { height: 38, hPad: spacing.sm, icon: 16, text: type.caption },
  md: { height: 48, hPad: spacing.lg, icon: 18, text: type.bodyBold },
  lg: { height: 54, hPad: spacing.xl, icon: 20, text: { ...type.title, letterSpacing: 0.2 } },
};

/**
 * Button
 * ------
 * Production button with variants, sizes, leading icon, loading and disabled
 * states, plus springy press feedback.
 *
 *   <Button label="Save" icon="check" onPress={...} />
 *   <Button variant="accent" size="lg" full loading label="Create" />
 */
const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  full = false,
  iconOnly = false,
  style,
  styleText,
  testID,
}) => {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const [press, pressHandlers] = usePressScale(disabled || loading ? 1 : 0.97);

  const isBlocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      disabled={isBlocked}
      hitSlop={6}
      onPress={isBlocked ? undefined : onPress}
      {...pressHandlers}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingVertical: 0,
          paddingHorizontal: iconOnly ? 0 : s.hPad,
          backgroundColor: pressed && v.pressed ? v.pressed : v.bg,
          borderColor: v.border || 'transparent',
          borderWidth: v.border ? 1 : 0,
          borderRadius: radius.full,
          opacity: disabled ? 0.5 : 1,
          ...shadow.subtle,
        },
        iconOnly && styles.iconOnly,
        full && { alignSelf: 'stretch' },
        press,
        style,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.on} />
      ) : iconOnly ? (
        <Icon name={icon} size={s.icon + 2} color={v.on} />
      ) : (
        <>
          {icon ? (
            <View style={{ marginRight: spacing.xs }}>
              <Icon name={icon} size={s.icon} color={v.on} />
            </View>
          ) : null}
          {label ? (
            <Text
              numberOfLines={2}
              style={[s.text, { color: v.on, textAlign: 'center' }, styleText]}
            >
              {label}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnly: {
    width: 48,
    paddingHorizontal: 0,
  },
});

export default Button;
