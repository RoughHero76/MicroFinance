import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {useColorScheme} from 'react-native';
import {brand} from '@/brand';
import {readJson, StorageKeys, writeJson} from '@/lib/storage';
import {modes, type ModeColors} from './modes';
import {palettes, type Accent, type ModeId, type PaletteId} from './palettes';
import {font, radius, size, space, weight, withAlpha} from './tokens';

export type ModeSetting = ModeId | 'system';

export interface ThemeColors extends ModeColors, Accent {
  primarySoft: string;
  successSoft: string;
  warningSoft: string;
  dangerSoft: string;
  infoSoft: string;
  mutedSoft: string;
}

export interface Theme {
  colors: ThemeColors;
  mode: ModeId;
  palette: PaletteId;
  dark: boolean;
  space: typeof space;
  radius: typeof radius;
  font: typeof font;
  weight: typeof weight;
  size: typeof size;
}

export function buildTheme(palette: PaletteId, mode: ModeId): Theme {
  const base = modes[mode];
  const accent = palettes[palette][mode];
  const soft = mode === 'dark' ? 0.18 : 0.12;
  return {
    colors: {
      ...base,
      ...accent,
      primarySoft: withAlpha(accent.primary, soft),
      successSoft: withAlpha(base.success, soft),
      warningSoft: withAlpha(base.warning, soft),
      dangerSoft: withAlpha(base.danger, soft),
      infoSoft: withAlpha(base.info, soft),
      mutedSoft: withAlpha(base.muted, soft),
    },
    mode,
    palette,
    dark: mode === 'dark',
    space,
    radius,
    font,
    weight,
    size,
  };
}

interface ThemeContextValue {
  theme: Theme;
  modeSetting: ModeSetting;
  setModeSetting: (mode: ModeSetting) => void;
  setPalette: (palette: PaletteId) => void;
  allowedPalettes: PaletteId[];
}

interface SavedTheme {
  mode?: ModeSetting;
  palette?: PaletteId;
}

const allowedPalettes = brand.allowedPalettes.filter(p => p in palettes);
const defaultPalette: PaletteId = brand.palette in palettes ? brand.palette : 'indigo';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({children, initial}: {children: React.ReactNode; initial?: SavedTheme}) {
  const systemScheme = useColorScheme();
  const [modeSetting, setModeState] = useState<ModeSetting>(initial?.mode ?? brand.defaultMode);
  const [palette, setPaletteState] = useState<PaletteId>(initial?.palette ?? defaultPalette);

  useEffect(() => {
    if (initial) {
      return;
    }
    readJson<SavedTheme>(StorageKeys.theme, {}).then(saved => {
      if (saved.mode) {
        setModeState(saved.mode);
      }
      if (saved.palette && allowedPalettes.includes(saved.palette)) {
        setPaletteState(saved.palette);
      }
    });
  }, [initial]);

  const mode: ModeId = modeSetting === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : modeSetting;
  const theme = useMemo(() => buildTheme(palette, mode), [palette, mode]);

  const setModeSetting = useCallback(
    (next: ModeSetting) => {
      setModeState(next);
      writeJson(StorageKeys.theme, {mode: next, palette});
    },
    [palette],
  );

  const setPalette = useCallback(
    (next: PaletteId) => {
      setPaletteState(next);
      writeJson(StorageKeys.theme, {mode: modeSetting, palette: next});
    },
    [modeSetting],
  );

  const value = useMemo(
    () => ({theme, modeSetting, setModeSetting, setPalette, allowedPalettes}),
    [theme, modeSetting, setModeSetting, setPalette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const fallback: ThemeContextValue = {
  theme: buildTheme(defaultPalette, 'light'),
  modeSetting: 'light',
  setModeSetting: () => {},
  setPalette: () => {},
  allowedPalettes,
};

export function useThemeSettings(): ThemeContextValue {
  return useContext(ThemeContext) ?? fallback;
}

export function useTheme(): Theme {
  return useThemeSettings().theme;
}
