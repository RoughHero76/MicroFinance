/**
 * Evi Design Tokens
 * -----------------
 * The single source of truth for colors, spacing, radii, type and motion.
 * Every screen and component must pull from here — never hardcode values.
 *
 * Theme: "Ink & Amber" — a light, warm workspace built on slate ink
 * with a single confident amber accent (the Evi brand yellow), plus
 * semantic state colors. Calm surfaces, generous whitespace, soft shadows.
 */

export const colors = {
  // Neutrals
  ink: '#111827',        // primary text (slate-900)
  inkSecondary: '#4B5563', // body text (slate-600)
  inkMuted: '#9CA3AF',     // captions / disabled (slate-400)
  inkFaint: '#F3F4F6',     // subtle fills (slate-100)

  bg: '#F5F6F8',           // app background
  surface: '#FFFFFF',      // cards / sheets
  surfaceAlt: '#FAFBFC',   // alt card fill
  border: '#E8EAEE',       // hairlines
  borderStrong: '#D6DAE1', // input borders

  // Brand
  primary: '#1F2937',      // slate — primary action
  primaryPressed: '#111827',
  onPrimary: '#FFFFFF',
  accent: '#F7B500',       // amber — brand highlight
  accentDeep: '#C98F00',   // amber text on light (AA)
  accentSoft: '#FFF6DE',   // amber tint surface
  accentInk: '#1F2937',    // text on amber

  // Dark surfaces (header / hero / splash)
  dark: '#0F172A',         // slate-900
  darkAlt: '#1E293B',      // slate-800
  onDark: '#F8FAFC',
  onDarkMuted: '#94A3B8',

  // Semantic
  success: '#059669',
  successSoft: '#DCFCE7',
  successInk: '#065F46',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  warningInk: '#92400E',
  danger: '#E11D48',
  dangerSoft: '#FFE4E6',
  dangerInk: '#9F1239',
  info: '#2563EB',
  infoSoft: '#DBEAFE',
  infoInk: '#1E40AF',
  neutral: '#64748B',
  neutralSoft: '#F1F5F9',
  neutralInk: '#334155',

  white: '#FFFFFF',
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const type = {
  display: { fontSize: 30, fontWeight: '700', lineHeight: 38 },
  h1: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  title: { fontSize: 17, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  sub: { fontSize: 13.5, fontWeight: '400', lineHeight: 19 },
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  micro: { fontSize: 11, fontWeight: '600', lineHeight: 14, letterSpacing: 0.4 },
};

/** Soft, modern elevation (iOS shadow + Android elevation). */
export const shadow = {
  card: {
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  raised: {
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  subtle: {
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
};

export const motion = {
  durationFast: 150,
  duration: 260,
  durationSlow: 420,
  spring: { damping: 20, stiffness: 180, mass: 0.9 },
  staggerStep: 45,
};

/** Map a loan / repayment / lead status string to a semantic color set. */
export const statusTheme = (status) => {
  const s = String(status || '').toLowerCase();
  if (/(active|open|approved|paid|success|completed|cleared|current)/.test(s)) {
    return { color: colors.success, bg: colors.successSoft, label: String(status || '').toUpperCase() };
  }
  if (/(npa|overdue|default|late|rejected|failed|cancelled|canceled|closed|suspended)/.test(s)) {
    return { color: colors.danger, bg: colors.dangerSoft, label: String(status || '').toUpperCase() };
  }
  if (/(pending|processing|in review|in-review|under|hold|disbursing)/.test(s)) {
    return { color: colors.warning, bg: colors.warningSoft, label: String(status || '').toUpperCase() };
  }
  if (/(repaid|settled|closed-?settled|completed)/.test(s)) {
    return { color: colors.info, bg: colors.infoSoft, label: String(status || '').toUpperCase() };
  }
  return { color: colors.neutral, bg: colors.neutralSoft, label: String(status || '').toUpperCase() };
};
