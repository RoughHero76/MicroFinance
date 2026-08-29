import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, radii, shadow, spacing, type } from '../../theme/tokens';

const VARIANTS = {
    primary: { bg: colors.brand, fg: colors.white },
    secondary: { bg: colors.brandTint, fg: colors.brand },
    ghost: { bg: 'transparent', fg: colors.brand },
    danger: { bg: colors.danger, fg: colors.white },
};

/**
 * App button. One of:
 *   <EviButton title="Sign in" onPress={...} loading={busy} />
 *   <EviButton title="Call" variant="secondary" icon="phone-outline" size="md" />
 */
export default function EviButton({
    title,
    onPress,
    variant = 'primary',
    size = 'lg',
    loading = false,
    disabled = false,
    icon = null,
    fullWidth = false,
    style,
    children,
}) {
    const isDisabled = disabled || loading;
    const v = VARIANTS[variant] || VARIANTS.primary;
    const height = size === 'lg' ? 52 : 42;
    const fontSize = size === 'lg' ? type.sizes.lg : type.sizes.md;

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [
                styles.base,
                { height, backgroundColor: v.bg, borderRadius: radii.md },
                fullWidth && styles.fullWidth,
                variant === 'primary' && shadow.card,
                pressed && { opacity: 0.85 },
                isDisabled && { opacity: 0.5 },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator size="small" color={v.fg} />
            ) : (
                <>
                    {icon && (
                        <Icon name={icon} size={fontSize + 4} color={v.fg} style={{ marginRight: spacing.sm }} />
                    )}
                    {children ?? (
                        <Text style={[styles.label, { color: v.fg, fontSize }]}>{title}</Text>
                    )}
                </>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    fullWidth: {
        width: '100%',
    },
    label: {
        fontWeight: type.weights.semibold,
        textAlign: 'center',
    },
});
