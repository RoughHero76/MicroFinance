import { MD3LightTheme } from 'react-native-paper';
import { colors } from './tokens';

// react-native-paper theme, aligned to the Evi tokens
export const eviPaperTheme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: colors.brand,
        secondary: colors.brand,
        background: colors.surface,
        card: colors.card,
        surface: colors.card,
        text: colors.ink,
        outline: colors.line,
        elevation: {
            0: 'transparent',
            1: colors.brandTint,
            2: colors.brandTint,
            3: colors.brandTint,
            4: colors.brandTint,
            5: colors.brandTint,
        },
    },
};
