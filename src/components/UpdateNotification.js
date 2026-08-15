// UpdateNotification.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useUpdateContext } from './context/UpdateContext';

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
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 10,
        flexDirection: 'column',
        alignItems: 'center',
    },
    text: {
        marginBottom: 10,
        textAlign: 'center',
        color: 'black',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
    },
    progressBarTrack: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        backgroundColor: '#dcdcdc',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#007AFF',
    },
    progressText: {
        marginTop: 5,
        color: 'black',
    },
});

export default UpdateNotification;