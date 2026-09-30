import type { ModeId } from './palettes';

export interface ModeColors {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  scrim: string;
  /** Toast pill background: dark glass in both modes. */
  toast: string;
  onToast: string;
  skeleton: string;
}

export const modes: Record<ModeId, ModeColors> = {
  light: {
    bg: '#F5F6FA',
    surface: '#FFFFFF',
    surface2: '#EEF0F6',
    text: '#0F172A',
    muted: '#64748B',
    border: '#E6E8EF',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#2563EB',
    scrim: 'rgba(15,23,42,0.42)',
    toast: 'rgba(15,23,42,0.92)',
    onToast: '#F8FAFC',
    skeleton: '#E6E8EF',
  },
  dark: {
    bg: '#0B0F17',
    surface: '#151B26',
    surface2: '#1E2635',
    text: '#E7EBF2',
    muted: '#8B95A7',
    border: '#263042',
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#F87171',
    info: '#60A5FA',
    scrim: 'rgba(0,0,0,0.6)',
    toast: 'rgba(30,38,53,0.96)',
    onToast: '#F8FAFC',
    skeleton: '#1E2635',
  },
};
