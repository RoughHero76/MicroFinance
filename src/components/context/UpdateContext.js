import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVersion } from 'react-native-device-info';
import ReactNativeBlobUtil from 'react-native-blob-util';
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

                if (response.status === 'success' && response.updateAvailable) {
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

    const installUpdate = async (filePath) => {
        try {
            await ReactNativeBlobUtil.android.actionViewIntent(
                filePath,
                'application/vnd.android.package-archive'
            );
        } catch (error) {
            console.error('Error installing APK:', error);
            Alert.alert('Installation Error', 'Could not open the installer. Please try again.');
        }
    };

    const downloadUpdate = async () => {
        if (downloading) return;

        const url = downloadUrl ? `${API_URL}${downloadUrl}` : `${API_URL}/api/shared/app/update/download`;
        const targetPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/MicroFinance-update.apk`;

        setDownloading(true);
        setDownloadProgress(0);

        try {
            const res = await ReactNativeBlobUtil.config({
                fileCache: true,
                path: targetPath,
                overwrite: true,
            })
                .fetch('GET', url)
                .progress((received, total) => {
                    if (total > 0) {
                        setDownloadProgress((received / total) * 100);
                    }
                });

            await installUpdate(res.path());
        } catch (error) {
            console.error('Error downloading update:', error);
            Alert.alert('Download Error', 'Failed to download the update. Please try again.');
        } finally {
            setDownloading(false);
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
