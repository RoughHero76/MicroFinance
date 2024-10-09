import React, { createContext, useState, useContext, useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVersion } from 'react-native-device-info';

const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export const UpdateContext = createContext();

export const UpdateProvider = ({ children }) => {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [latestVersion, setLatestVersion] = useState(null);

    useEffect(() => {
        checkForUpdates();
    }, []);

    const checkForUpdates = async () => {
        try {
            const lastCheckTime = await AsyncStorage.getItem('lastUpdateCheck');
            const currentTime = new Date().getTime();

            if (!lastCheckTime || currentTime - parseInt(lastCheckTime) > UPDATE_CHECK_INTERVAL) {
               /*  const response = await fetch('YOUR_API_ENDPOINT_HERE'); */
               /*  const data = await response.json() */;

                const currentVersion = getVersion();
                console.log('Current version:', currentVersion);
                setLatestVersion(data.latestVersion);

                if (data.latestVersion > currentVersion) {
                    setUpdateAvailable(true);
                }

                await AsyncStorage.setItem('lastUpdateCheck', currentTime.toString());
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    };

    const downloadUpdate = () => {
        const url = Platform.select({
            ios: 'YOUR_APP_STORE_URL',
            android: 'YOUR_GITHUB_RELEASE_URL',
        });
        Linking.openURL(url);
    };

    return (
        <UpdateContext.Provider value={{ updateAvailable, latestVersion, checkForUpdates, downloadUpdate }}>
            {children}
        </UpdateContext.Provider>
    );
};

export const useUpdateContext = () => useContext(UpdateContext);