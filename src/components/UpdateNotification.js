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
                <Text style={styles.progressText}>{`Downloading... ${downloadProgress.toFixed(2)}%`}</Text>
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
        color: 'black',
        fontWeight: 'bold',
    },
    progressText: {
        marginTop: 5,
    },
});

export default UpdateNotification;