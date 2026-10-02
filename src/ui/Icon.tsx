import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme, type ThemeColors} from '@/theme';

export type IconName = string;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: keyof ThemeColors | (string & {});
  accessibilityLabel?: string;
}

export function Icon({name, size = 20, color = 'text', accessibilityLabel}: IconProps) {
  const t = useTheme();
  const resolved = (t.colors as unknown as Record<string, string>)[color] ?? color;
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={resolved}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    />
  );
}
