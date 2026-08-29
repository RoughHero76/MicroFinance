// ─────────────────────────────────────────────────────────────
// Evi Finance — Design Tokens
// Single source of truth for every visual value in the app.
// Never hardcode colors/spacing/radii in screens — import from here.
// ─────────────────────────────────────────────────────────────

export const colors = {
    // Brand
    brand: '#0E5A3A',        // deep evergreen — primary action, identity
    brandDark: '#0A472E',    // pressed / gradient end
    brandTint: '#E8F3EE',    // icon chips, selected surfaces
    brandSoft: '#CFE8DC',    // borders on tinted surfaces

    // Neutrals
    ink: '#12241C',          // primary text
    inkSoft: '#5C6B64',      // secondary text
    inkFaint: '#8A968F',     // placeholders, disabled
    surface: '#F5F8F6',      // app background
    card: '#FFFFFF',         // card background
    line: '#E3EAE6',         // dividers, input borders

    // Status (semantic — use via tones / StatusBadge, not raw)
    success: '#16A34A',
    successTint: '#E7F6EC',
    warning: '#D97706',
    warningTint: '#FDF0DF',
    orange: '#EA580C',
    orangeTint: '#FDEBDD',
    danger: '#DC2626',
    dangerTint: '#FDEBEB',
    info: '#0369A1',
    infoTint: '#E6F2F9',

    // Dark (auth screens)
    night: '#0A1F16',
    nightSoft: '#123227',
    nightLine: '#1E4635',
    nightText: '#9DB4A8',

    white: '#FFFFFF',
};

// tone name → { fg, bg } — pair a foreground with its tinted background
export const tones = {
    brand: { fg: colors.brand, bg: colors.brandTint },
    success: { fg: colors.success, bg: colors.successTint },
    warning: { fg: colors.warning, bg: colors.warningTint },
    orange: { fg: colors.orange, bg: colors.orangeTint },
    danger: { fg: colors.danger, bg: colors.dangerTint },
    info: { fg: colors.info, bg: colors.infoTint },
    neutral: { fg: colors.inkSoft, bg: colors.surface },
};

// Loan / portfolio status → tone. Add new statuses here, never in screens.
const STATUS_TONE = {
    active: 'success',
    approved: 'success',
    paid: 'success',
    completed: 'info',
    closed: 'neutral',
    pending: 'warning',
    'pending approval': 'warning',
    review: 'warning',
    overdue: 'danger',
    default: 'danger',
    rejected: 'danger',
    inactive: 'danger',
    npa: 'danger',
    sma0: 'warning',
    sma1: 'orange',
    sma2: 'danger',
};

export const getStatusTone = (status) => {
    if (!status) return 'neutral';
    return STATUS_TONE[String(status).toLowerCase().trim()] || 'neutral';
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radii = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

export const type = {
    sizes: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, display: 32 },
    weights: { regular: '400', medium: '500', semibold: '600', bold: '700' },
};

// Consistent soft card shadow (light, greenish-black, low opacity)
export const shadow = {
    card: {
        shadowColor: '#0A1F16',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
};

// Minimum tap size — this app is used by field agents with real hands
export const touchTarget = 48;

// Convenience aggregate — components may import { tokens } and destructure.
export const tokens = { colors, tones, spacing, radii, type, shadow, touchTarget };
