/* eslint-env jest */
import { jest } from '@jest/globals';
// Native modules have no implementation under Jest; these mocks stand in.
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  useNetInfo: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
}));
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
  getSupportedBiometryType: jest.fn(() => Promise.resolve(null)),
  ACCESS_CONTROL: { BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode' },
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly' },
  SECURITY_LEVEL: { ANY: 'ANY' },
  STORAGE_TYPE: { RSA: 'KeystoreRSAECB', AES: 'KeystoreAESCBC' },
}));
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
jest.mock('react-native-blob-util', () => ({ fs: { dirs: {} }, config: jest.fn(), android: {} }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));
jest.mock('@dr.pogodin/react-native-fs', () => ({
  CachesDirectoryPath: '/cache',
  DownloadDirectoryPath: '/download',
  DocumentDirectoryPath: '/docs',
  exists: jest.fn(() => Promise.resolve(false)),
  downloadFile: jest.fn(() => ({ promise: Promise.resolve({ statusCode: 200 }) })),
  unlink: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  readDir: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-share', () => ({ open: jest.fn(() => Promise.resolve()) }));
jest.mock('react-native-permissions', () => require('react-native-permissions/mock'));
jest.mock('react-native-biometrics', () =>
  jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn(() => Promise.resolve({available: true, biometryType: 'Biometrics'})),
    simplePrompt: jest.fn(() => Promise.resolve({success: true})),
  })),
);
