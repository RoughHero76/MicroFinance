// src/shared/About.js
import React, { useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet, Image, ScrollView } from 'react-native';
import { useUpdateContext } from '../../components/context/UpdateContext';
import { getVersion } from 'react-native-device-info';
import AppLogo from '../../assets/branding/76Groups.png';
import { colors, spacing, type, radii } from '../../theme/tokens';
import EviCard from '../../components/ui/EviCard';
import EviButton from '../../components/ui/EviButton';
import EviProgress from '../../components/ui/EviProgress';

const About = () => {
    const { updateAvailable, latestVersion, downloadUpdate, downloading, downloadProgress, checkForUpdates } = useUpdateContext();
    const [currentVersion, setCurrentVersion] = useState('');

    useEffect(() => {
        const fetchVersionAndUpdate = async () => {
            const version = getVersion();
            setCurrentVersion(version);

            // Force an update check when the About page loads
            await checkForUpdates(true);
        };
        fetchVersionAndUpdate();
    }, []);

    const handleDownload = () => {
        if (updateAvailable) {
            downloadUpdate();
        } else {
            Alert.alert('No Updates', 'Your app is up to date!');
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.logoRing}>
                <Image source={AppLogo} style={styles.logo} />
            </View>
            <Text style={styles.title}>About 76Softwares</Text>
            <Text style={styles.text}>Current Version: {currentVersion}</Text>

            {updateAvailable ? (
                <>
                    <Text style={styles.text}>A new version {latestVersion} is available!</Text>
                    {downloading ? (
                        <EviProgress
                            value={Number(downloadProgress) || 0}
                            label={`Downloading update… ${downloadProgress}%`}
                            tone="brand"
                            style={styles.progress}
                        />
                    ) : (
                        <EviButton title="Download Update" onPress={handleDownload} variant="primary" size="lg" style={styles.downloadButton} />
                    )}
                </>
            ) : (
                <Text style={styles.upToDate}>✓ Your app is up to date.</Text>
            )}

            {/* Legal Terms */}
            <EviCard style={styles.legalCard} elevated={false}>
                <Text style={styles.legalTitle}>Legal Terms & Conditions</Text>
                <Text style={styles.legalText}>
                    This software is the property of 76Softwares. Unauthorized copying, distribution, or modification of this app is strictly prohibited.
                    By using this software, you agree to comply with all applicable copyright laws. Violation of these terms may result in legal action.
                </Text>
            </EviCard>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center',
        padding: spacing.xl,
        backgroundColor: colors.surface,
    },
    logoRing: {
        backgroundColor: colors.card,
        borderRadius: radii.xl,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    logo: {
        width: 150,
        height: 150,
        resizeMode: 'contain',
    },
    title: {
        fontSize: type.sizes.display,
        fontWeight: type.weights.bold,
        marginBottom: spacing.md,
        color: colors.ink,
    },
    text: {
        fontSize: type.sizes.md,
        marginVertical: spacing.sm,
        color: colors.inkSoft,
        textAlign: 'center',
    },
    upToDate: {
        fontSize: type.sizes.md,
        color: colors.success,
        fontWeight: type.weights.medium,
        marginVertical: spacing.sm,
    },
    progress: {
        width: '100%',
        marginTop: spacing.md,
    },
    downloadButton: {
        marginTop: spacing.lg,
    },
    legalCard: {
        marginTop: spacing.xxl,
        alignSelf: 'stretch',
    },
    legalTitle: {
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        marginBottom: spacing.sm,
        color: colors.ink,
    },
    legalText: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        lineHeight: 20,
    },
});

export default About;
