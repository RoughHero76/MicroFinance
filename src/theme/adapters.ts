import { DarkTheme, DefaultTheme, type Theme as NavTheme } from '@react-navigation/native';
import type { Theme } from './ThemeProvider';

/** React Navigation theme, so headers, cards and tab bars follow the app theme. */
export function navigationTheme(t: Theme): NavTheme {
  const base = t.dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: t.dark,
    colors: {
      ...base.colors,
      primary: t.colors.primary,
      background: t.colors.bg,
      card: t.colors.surface,
      text: t.colors.text,
      border: t.colors.border,
      notification: t.colors.danger,
    },
  };
}

export function statusBarStyle(t: Theme): 'light-content' | 'dark-content' {
  return t.dark ? 'light-content' : 'dark-content';
}

/** react-native-chart-kit config, so charts are readable in both modes. */
export function chartConfig(t: Theme) {
  const rgb = hexToRgb(t.colors.primary);
  const textRgb = hexToRgb(t.colors.muted);
  return {
    backgroundGradientFrom: t.colors.surface,
    backgroundGradientTo: t.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${rgb}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${textRgb}, ${opacity})`,
    propsForBackgroundLines: { stroke: t.colors.border },
  };
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '').slice(0, 6);
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
