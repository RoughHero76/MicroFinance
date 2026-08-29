import { DefaultTheme } from '@react-navigation/native';
import { colors } from './tokens';

/**
 * Ink & Amber navigation theme.
 * Drives the native headers (which most sub-screens use via `headerShown: true`)
 * so titles, backgrounds and hairline borders match the design system instead of
 * the default React Navigation blue.
 */
const InkAmberTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.surface,
    text: colors.ink,
    border: colors.border,
    notification: colors.danger,
  },
};

export default InkAmberTheme;
