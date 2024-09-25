import React, { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const GetPermissions = ({ permissionsToRequest }) => {

  const checkAndRequestPermissions = async () => {
    for (const permission of permissionsToRequest) {
      try {
        const result = await check(permission);
        console.log(`Checking ${permission}: ${result}`);

        switch (result) {
          case RESULTS.UNAVAILABLE:
            console.log(`${permission} is not available on this device.`);
            break;
          case RESULTS.DENIED:
            console.log(`${permission} is denied, requesting permission...`);
            const requestResult = await request(permission);
            console.log(`Request result for ${permission}: ${requestResult}`);
            handleRequestResult(permission, requestResult);
            break;
          case RESULTS.LIMITED:
            console.log(`${permission} is limited.`);
            break;
          case RESULTS.GRANTED:
            console.log(`${permission} is already granted.`);
            break;
          case RESULTS.BLOCKED:
            console.log(`${permission} is blocked by the user.`);
            Alert.alert('Permission Blocked', `Please enable ${permission} in your device settings.`);
            break;
          default:
            console.log(`Unhandled result for ${permission}: ${result}`);
        }
      } catch (error) {
        console.log(`Error requesting ${permission}: ${error}`);
      }
    }
  };

  const handleRequestResult = (permission, result) => {
    if (result === RESULTS.GRANTED) {
      console.log(`${permission} is granted.`);
    } else {
      console.log(`${permission} is denied.`);
      Alert.alert('Permission Denied', `You denied ${permission}.`);
    }
  };

  useEffect(() => {
    checkAndRequestPermissions();
  }, []);

  return null; // No UI needed for this component
};

export default GetPermissions;
