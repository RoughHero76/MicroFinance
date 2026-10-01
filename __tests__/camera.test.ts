// The camera is asked for the first time it's used. When the person has
// blocked it ("Don't allow" twice), the app says so and offers the settings,
// instead of a generic error.

import {afterEach, describe, expect, it, jest} from '@jest/globals';
import {PermissionsAndroid, Platform} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import {pickImage} from '@/lib/image';
import {toast} from '@/ui/Toast';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('camera permission', () => {
  it('blocked: no camera, a toast with Open settings', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
    const errorToast = jest.spyOn(toast, 'error').mockImplementation(() => undefined);

    expect(await pickImage('profile', 'camera')).toBeNull();
    expect(ImagePicker.openCamera).not.toHaveBeenCalled();
    expect(errorToast).toHaveBeenCalledWith(
      'Camera is turned off for this app',
      expect.objectContaining({action: expect.objectContaining({label: 'Open settings'})}),
    );
  });

  it('declined once: nothing happens, no error', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
    const errorToast = jest.spyOn(toast, 'error').mockImplementation(() => undefined);

    expect(await pickImage('profile', 'camera')).toBeNull();
    expect(errorToast).not.toHaveBeenCalled();
  });
});
