import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVersion } from 'react-native-device-info';
import { apiCall } from '../api/apiUtils';
import { API_URL } from '../api/secrets';
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export const UpdateContext = createContext();

export const UpdateProvider = ({ children }) => {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [latestVersion, setLatestVersion] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    useEffect(() => {
        checkForUpdates();
    }, []);

    const checkForUpdates = async (forceCheck = false) => {
        try {
            const lastCheckTime = await AsyncStorage.getItem('lastUpdateCheck');
            const currentTime = new Date().getTime();

            if (forceCheck || !lastCheckTime || currentTime - parseInt(lastCheckTime) > UPDATE_CHECK_INTERVAL) {
                const currentVersion = getVersion();
                const response = await apiCall(`/api/shared/app/update/check?currentVersion=${currentVersion}`, 'GET');

                if (response.updateAvailable) {
                    setUpdateAvailable(true);
                    setLatestVersion(response.latestVersion);
                    setDownloadUrl(response.downloadUrl);
                }

                await AsyncStorage.setItem('lastUpdateCheck', currentTime.toString());
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    };


    const downloadUpdate = async () => {
        Linking.openURL(`${API_URL}/download`);
    };

    const installUpdate = async (filePath) => {
        try {
            Alert.alert(
                'Update Ready',
                `The update has been downloaded to: ${filePath}. Please install it manually.`,
                [
                    { text: 'OK', onPress: () => console.log('OK Pressed') }
                ]
            );
        } catch (error) {
            console.error('Error installing APK:', error);
            Alert.alert('Installation Error', error.message);
        }
    };

    return (
        <UpdateContext.Provider value={{
            updateAvailable,
            latestVersion,
            downloadUpdate,
            downloading,
            downloadProgress,
            checkForUpdates,
        }}>
            {children}
        </UpdateContext.Provider>
    );
};

export const useUpdateContext = () => useContext(UpdateContext);