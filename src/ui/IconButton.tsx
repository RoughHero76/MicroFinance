import React, {useContext} from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import {makeStyles, useTheme, withAlpha} from '@/theme';
import {Icon} from './Icon';
import {PressableScale} from './PressableScale';
import {HeaderSlot} from './headerSlot';
import {Text} from './Text';

export interface IconButtonProps {
  icon: string;
  /** Required: read by screen readers (U-12). */
  label: string;
  onPress?: () => void;
  /** outline: the mock's header button, a bordered rounded square on the surface. */
  /** ring: a round bordered button (contact actions in the mock). */
  variant?: 'tonal' | 'plain' | 'filled' | 'outline' | 'ring';
  size?: number;
  color?: string;
  badge?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Round 36dp button (call, SMS, WhatsApp, header actions) with a 48dp tap area. */
export function IconButton({
  icon,
  label,
  onPress,
  variant = 'tonal',
  size = 36,
  color,
  badge,
  disabled,
  style,
  testID,
}: IconButtonProps) {
  const t = useTheme();
  const s = useStyles();
  const slot = useContext(HeaderSlot);
  const inHeader = slot !== null && variant === 'plain';
  const fg =
    color ?? (variant === 'filled' ? t.colors.onPrimary : variant === 'tonal' ? t.colors.primary : t.colors.text);
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      disabled={disabled}
      hitSlop={(48 - size) / 2}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={[
        s.base,
        {width: size, height: size, borderRadius: size / 2},
        variant === 'tonal' && s.tonal,
        variant === 'filled' && s.filled,
        variant === 'outline' && s.outline,
        variant === 'ring' && s.ring,
        inHeader && (slot === 'band' ? s.glass : s.outline),
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
    </PressableScale>
  );
}

const useStyles = makeStyles(t => ({
  base: {alignItems: 'center', justifyContent: 'center'},
  tonal: {backgroundColor: t.colors.primarySoft},
  filled: {backgroundColor: t.colors.primary},
  glass: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withAlpha(t.colors.white, 0.28),
    backgroundColor: withAlpha(t.colors.white, 0.16),
  },
  ring: {borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface},
  outline: {borderRadius: 12, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface},
  disabled: {opacity: 0.4},
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
  badgeText: {color: t.colors.white, fontSize: 10, lineHeight: 12},
}));
