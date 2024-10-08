import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import { Alert } from 'react-native';

const GetPermission = async (permission) => {
  try {
    const result = await check(permission);

    switch (result) {
      case RESULTS.UNAVAILABLE:
        return false;
      case RESULTS.DENIED:
        const requestResult = await request(permission);
        return handleRequestResult(permission, requestResult);
      case RESULTS.LIMITED:
        return true;
      case RESULTS.GRANTED:
        return true;
      case RESULTS.BLOCKED:
        Alert.alert(
          'Permission Blocked',
          `Please enable ${permission} in your device settings.`,
          [
            { text: 'OK' },
            { text: 'Open Settings', onPress: () => openSettings() }
          ]
        );
        return false;
      default:
        return false;
    }
  } catch (error) {
    console.log(`Error requesting ${permission}: ${error}`);
    return false;
  }
};

const handleRequestResult = (permission, result) => {
  if (result === RESULTS.GRANTED) {
    return true;
  } else if (result === RESULTS.BLOCKED) {
    Alert.alert(
      'Permission Blocked',
      `The permission ${permission} is blocked. Please enable it in your device settings.`,
      [
        { text: 'OK' },
        { text: 'Open Settings', onPress: () => openSettings() }
      ]
    );
    return false;
  } else {
    Alert.alert('Permission Denied', `You denied ${permission}.`);
    return false;
  }
};

export default GetPermission;