import type { PaletteId } from '@/theme/palettes';

export type Lang = 'en' | 'hi';
export type Localized = Record<Lang, string>;

export interface Brand {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  poweredBy: string;
  showPoweredBy: boolean;
  palette: PaletteId;
  allowedPalettes: PaletteId[];
  defaultMode: 'light' | 'dark' | 'system';
  languages: Lang[];
  apiUrl: string;
  storageFolder: string;
  support: { phone: string; whatsapp: string; email: string; hours: string };
  legal: { termsUrl: string; privacyUrl: string };
  receipt: { sms: Localized; whatsapp: Localized; penalty: Localized };
  features: { leads: boolean; calculator: boolean; appLock: boolean };
  android: { applicationId: string; appName: string };
}
