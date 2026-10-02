import {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import {useTheme, type Theme} from './ThemeProvider';

/**
 * Themed styles, built once per theme:
 *
 *   const useStyles = makeStyles(t => ({ card: { backgroundColor: t.colors.surface } }));
 *   const s = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T) {
  const cache = new WeakMap<Theme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => {
      let styles = cache.get(theme);
      if (!styles) {
        styles = StyleSheet.create(factory(theme));
        cache.set(theme, styles);
      }
      return styles;
    }, [theme]);
  };
}
