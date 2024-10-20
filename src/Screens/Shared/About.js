// src/shared/About.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, StyleSheet, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useUpdateContext } from '../../components/context/UpdateContext';
import { getVersion } from 'react-native-device-info';
import AppLogo from '../../assets/branding/76Groups.png'; // Assuming this is your company logo

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
            <Image source={AppLogo} style={styles.logo} />
            <Text style={styles.title}>About 76Softwares</Text>
            <Text style={styles.text}>Current Version: {currentVersion}</Text>

            {updateAvailable ? (
                <>
                    <Text style={styles.text}>A new version {latestVersion} is available!</Text>
                    {downloading ? (
                        <View style={styles.progressContainer}>
                            <Text>Downloading update: {downloadProgress}%</Text>
                            <ActivityIndicator size="small" color="#0000ff" />
                        </View>
                    ) : (
                        <Button title="Download Update" onPress={handleDownload} />
                    )}
                </>
            ) : (
                <Text style={styles.text}>Your app is up to date.</Text>
            )}

            {/* Legal Terms */}
            <View style={styles.legalContainer}>
                <Text style={styles.legalTitle}>Legal Terms & Conditions</Text>
                <Text style={styles.legalText}>
                    This software is the property of 76Softwares. Unauthorized copying, distribution, or modification of this app is strictly prohibited.
                    By using this software, you agree to comply with all applicable copyright laws. Violation of these terms may result in legal action.
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    logo: {
        width: 150,
        height: 150,
        resizeMode: 'contain',
        marginBottom: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    text: {
        fontSize: 16,
        marginVertical: 10,
        color: '#555',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    legalContainer: {
        marginTop: 40,
        paddingHorizontal: 20,
    },
    legalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
        alignSelf: 'center'
    },
    legalText: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
    },
});

export default About;
