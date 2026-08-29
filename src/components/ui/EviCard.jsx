import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, shadow, spacing } from '../../theme/tokens';

/**
 * Base surface. Every card in the app flows through this.
 * Pass onPress to make it tappable (press feedback included).
 */
export default function EviCard({ children, onPress, style, padding = spacing.lg, elevated = true }) {
    const content = (
        <View
            style={[
                styles.card,
                elevated && styles.elevated,
                { padding },
                style,
            ]}
        >
            {children}
        </View>
    );

    if (!onPress) return content;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] }}
        >
            {content}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        overflow: 'hidden',
    },
    elevated: shadow.card,
});
