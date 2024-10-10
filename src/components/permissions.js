import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Alert, Linking } from 'react-native';

const androidSDKVersion = Platform.Version;
const isAndroid13OrHigher = androidSDKVersion >= 33;
const isAndroid11OrHigher = androidSDKVersion >= 30;
const isAndroid10OrHigher = androidSDKVersion >= 29;

const GetPermission = async (permission) => {
  if (Platform.OS !== 'android') return true;

  // For Android 10+, we don't need to request storage permissions for app-specific directories
  if (isAndroid10OrHigher && (
    permission === PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE ||
    permission === PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE
  )) {
    console.log(`Skipping ${permission} for Android 10+, using app-specific storage`);
    return true;
  }

  // Handle MANAGE_EXTERNAL_STORAGE for Android 11+
  if (isAndroid11OrHigher && permission === PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE) {
    return handleManageExternalStorage();
  }

  try {
    const result = await check(permission);
    switch (result) {
      case RESULTS.GRANTED:
        console.log(`Permission ${permission} already granted`);
        return true;
      case RESULTS.DENIED:
        console.log(`Requesting permission ${permission}`);
        const requestResult = await request(permission);
        return requestResult === RESULTS.GRANTED;
      case RESULTS.BLOCKED:
        console.log(`Permission ${permission} is blocked`);
        return handleBlockedPermission(permission);
      default:
        console.log(`Unexpected result for permission ${permission}: ${result}`);
        return false;
    }
  } catch (error) {
    console.error(`Error handling permission ${permission}:`, error);
    return false;
  }
};

const handleManageExternalStorage = async () => {
  const result = await check(PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE);
  if (result === RESULTS.GRANTED) {
    console.log('MANAGE_EXTERNAL_STORAGE permission already granted');
    return true;
  }

  console.log('MANAGE_EXTERNAL_STORAGE permission not granted, prompting user');
  return new Promise((resolve) => {
    Alert.alert(
      'All Files Access Permission Required',
      'This app needs access to manage all files on your device for downloads. Please grant the permission in the next screen.',
      [
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings();
            resolve(false);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false)
        }
      ]
    );
  });
};

const handleBlockedPermission = (permission) => {
  return new Promise((resolve) => {
    Alert.alert(
      'Permission Blocked',
      `The ${permission} is blocked. Please enable it in your device settings to allow file downloads.`,
      [
        { text: 'OK', onPress: () => resolve(false) },
        { text: 'Open Settings', onPress: () => {
          Linking.openSettings();
          resolve(false);
        }}
      ]
    );
  });
};

export default GetPermission;