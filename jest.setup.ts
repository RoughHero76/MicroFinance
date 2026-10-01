/* eslint-env jest */
import {jest} from '@jest/globals';
// Native modules have no implementation under Jest; these mocks stand in.
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({isConnected: true, isInternetReachable: true})),
  useNetInfo: jest.fn(() => ({isConnected: true, isInternetReachable: true})),
}));
jest.mock('react-native-keychain', () => {
  // Keeps what's stored, like the real keychain.
  const store: Record<string, {username: string; password: string}> = {};
  return {
    setGenericPassword: jest.fn((username: string, password: string, opts?: {service?: string}) => {
      store[opts?.service ?? ''] = {username, password};
      return Promise.resolve(true);
    }),
    getGenericPassword: jest.fn((opts?: {service?: string}) => Promise.resolve(store[opts?.service ?? ''] ?? false)),
    resetGenericPassword: jest.fn((opts?: {service?: string}) => {
      delete store[opts?.service ?? ''];
      return Promise.resolve(true);
    }),
    getSupportedBiometryType: jest.fn(() => Promise.resolve(null)),
    ACCESS_CONTROL: {BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode'},
    ACCESSIBLE: {WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly'},
    SECURITY_LEVEL: {ANY: 'ANY'},
    STORAGE_TYPE: {RSA: 'KeystoreRSAECB', AES: 'KeystoreAESCBC'},
  };
});
jest.mock('react-native-image-crop-picker', () => ({
  openPicker: jest.fn(),
  openCamera: jest.fn(),
  clean: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.4',
  getBuildNumber: () => '4',
  getModel: () => 'Jest',
  getSystemVersion: () => '14',
  getUniqueIdSync: () => 'jest-device',
}));
jest.mock('react-native-blob-util', () => ({fs: {dirs: {}}, config: jest.fn(), android: {}}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));
jest.mock('@dr.pogodin/react-native-fs', () => ({
  CachesDirectoryPath: '/cache',
  DownloadDirectoryPath: '/download',
  DocumentDirectoryPath: '/docs',
  exists: jest.fn(() => Promise.resolve(false)),
  downloadFile: jest.fn(() => ({promise: Promise.resolve({statusCode: 200})})),
  unlink: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  readDir: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-share', () => ({open: jest.fn(() => Promise.resolve())}));
jest.mock('react-native-biometrics', () =>
  jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn(() => Promise.resolve({available: true, biometryType: 'Biometrics'})),
    simplePrompt: jest.fn(() => Promise.resolve({success: true})),
  })),
);
jest.mock('@react-native-clipboard/clipboard', () => require('@react-native-clipboard/clipboard/jest/clipboard-mock'));
jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: {trigger: jest.fn()},
  HapticFeedbackTypes: {},
}));
// Firebase messaging: a fake phone token and listeners that tests can fire.
jest.mock('@react-native-firebase/messaging', () => {
  const listeners: Record<string, ((m: unknown) => void)[]> = {};
  const add = (name: string) => (_m: unknown, fn: (m: unknown) => void) => {
    (listeners[name] = listeners[name] ?? []).push(fn);
    return () => {
      listeners[name] = (listeners[name] ?? []).filter(f => f !== fn);
    };
  };
  return {
    getMessaging: jest.fn(() => ({})),
    getToken: jest.fn(() => Promise.resolve('fcm-token-for-tests-0000000000')),
    deleteToken: jest.fn(() => Promise.resolve()),
    onMessage: jest.fn(add('message')),
    onNotificationOpenedApp: jest.fn(add('opened')),
    onTokenRefresh: jest.fn(add('token')),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
    setBackgroundMessageHandler: jest.fn(),
    __fire: (name: string, message: unknown) => (listeners[name] ?? []).forEach(fn => fn(message)),
  };
});
