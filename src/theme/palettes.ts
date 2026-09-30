// Accent colours only. Surfaces, text and status colours come from modes.ts.
// Values match the approved plan (.lavish/ui-consistency.html).

export type PaletteId = 'indigo' | 'emerald' | 'evi' | 'saffron';
export type ModeId = 'light' | 'dark';

export interface Accent {
  primary: string;
  primary2: string;
  onPrimary: string;
}

export const palettes: Record<PaletteId, Record<ModeId, Accent>> = {
  indigo: {
    light: { primary: '#4F46E5', primary2: '#8B5CF6', onPrimary: '#FFFFFF' },
    dark: { primary: '#818CF8', primary2: '#C084FC', onPrimary: '#0B0F17' },
  },
  emerald: {
    light: { primary: '#059669', primary2: '#0EA5E9', onPrimary: '#FFFFFF' },
    dark: { primary: '#34D399', primary2: '#38BDF8', onPrimary: '#0B0F17' },
  },
  evi: {
    light: { primary: '#2C3E50', primary2: '#5FA83F', onPrimary: '#FFFFFF' },
    dark: { primary: '#8FB8DE', primary2: '#7CC35A', onPrimary: '#0B0F17' },
  },
  saffron: {
    light: { primary: '#C2410C', primary2: '#DB2777', onPrimary: '#FFFFFF' },
    dark: { primary: '#FB923C', primary2: '#F472B6', onPrimary: '#0B0F17' },
  },
};

export const paletteIds = Object.keys(palettes) as PaletteId[];
