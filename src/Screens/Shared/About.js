// src/shared/About.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useUpdateContext } from '../../components/context/UpdateContext';
import { getVersion } from 'react-native-device-info';

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
        <View style={styles.container}>
            <Text style={styles.title}>About This App</Text>
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    text: {
        fontSize: 16,
        marginVertical: 10,
        color: 'black',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
});

export default About;
