import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useUpdateContext } from './context/UpdateContext';

const UpdateNotification = () => {
    const { updateAvailable, latestVersion, downloadUpdate } = useUpdateContext();

    if (!updateAvailable) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.text}>A new version ({latestVersion}) is available!</Text>
            <TouchableOpacity onPress={downloadUpdate} style={styles.button}>
                <Text style={styles.buttonText}>Update Now</Text>
            </TouchableOpacity>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    text: {
        flex: 1,
        marginRight: 10,
    },
    button: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default UpdateNotification;