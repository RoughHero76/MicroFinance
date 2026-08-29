// UpdateNotification.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useUpdateContext } from './context/UpdateContext';
import { colors, radii, spacing, type } from '../theme/tokens';

const UpdateNotification = () => {
    const { updateAvailable, latestVersion, downloadUpdate, downloading, downloadProgress } = useUpdateContext();

    if (!updateAvailable) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.text}>A new version ({latestVersion}) is available!</Text>
            {downloading ? (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{`Downloading... ${downloadProgress.toFixed(0)}%`}</Text>
                </View>
            ) : (
                <TouchableOpacity style={styles.button} onPress={downloadUpdate}>
                    <Text style={styles.buttonText}>Update Now</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: radii.md,
        flexDirection: 'column',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.brandSoft,
        shadowColor: colors.night,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 5,
    },
    text: {
        marginBottom: spacing.md,
        textAlign: 'center',
        color: colors.ink,
        fontSize: type.sizes.sm,
        fontWeight: type.weights.medium,
    },
    button: {
        backgroundColor: colors.brand,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radii.sm,
    },
    buttonText: {
        color: colors.white,
        fontWeight: type.weights.bold,
        fontSize: type.sizes.sm,
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
    },
    progressBarTrack: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.brandTint,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.brand,
    },
    progressText: {
        marginTop: 5,
        color: colors.inkSoft,
        fontSize: type.sizes.xs,
    },
});

export default UpdateNotification;