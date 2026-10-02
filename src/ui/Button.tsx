// The button system (round 8): one height (36dp, 48dp tap area), four
// variants. Primary: the one main action. Secondary: an outlined pill next to
// it. Text: less important actions. Danger: destructive confirmations.

import React from 'react';
import {ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {makeStyles, useTheme} from '@/theme';
import {Icon} from './Icon';
import {PressableScale} from './PressableScale';
import {Text} from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'danger';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the parent's width (sheet rows only; screens use floating actions). */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  block,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const t = useTheme();
  const s = useStyles();
  const inactive = disabled || loading;

  const fg =
    variant === 'primary'
      ? t.colors.onPrimary
      : variant === 'danger'
      ? t.colors.white
      : variant === 'secondary'
      ? t.colors.text
      : t.colors.primary;

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.95}
      disabled={inactive}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{disabled: !!inactive, busy: !!loading}}
      testID={testID}
      style={[s.base, s[variant], block && s.block, inactive && s.disabled, style]}>
      <View style={s.content}>
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : icon ? (
          <Icon name={icon} size={18} color={fg} />
        ) : null}
        <Text variant="label" weight="semibold" style={{color: fg}} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles(t => ({
  base: {
    minHeight: t.size.control,
    paddingHorizontal: t.space.lg,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  content: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  primary: {backgroundColor: t.colors.primary, ...t.shadow.primary, shadowOpacity: 0.25, elevation: 3},
  danger: {backgroundColor: t.colors.danger},
  secondary: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  text: {paddingHorizontal: t.space.sm, backgroundColor: 'transparent'},
  block: {alignSelf: 'stretch'},
  disabled: {opacity: 0.45},
}));
