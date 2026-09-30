// Spacing, radius and type scale shared by every palette and mode.

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const font = {
  caption: 12,
  small: 13,
  body: 14,
  bodyLg: 16,
  title: 18,
  h2: 20,
  h1: 24,
  display: 30,
} as const;

export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// U-04: buttons look 36dp tall but always get a 48dp tap area.
export const size = {
  control: 36,
  input: 48,
  tap: 48,
  icon: 20,
  avatar: 40,
  tabBar: 60,
} as const;

/** Adds an alpha channel to a #RRGGBB colour (for soft tinted backgrounds). */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${h}${a}`;
}
