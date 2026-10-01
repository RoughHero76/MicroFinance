// Phone notifications: the phone registers with its language, sign-out and
// the Settings switch remove it (once, even if called twice), and a tapped
// notification maps to the right screen.

import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import {notificationTarget} from '@/features/notifications/text';
import {api} from '@/lib/api';
import {isPushEnabled, registerPush, setPushEnabled, unregisterPush} from '@/lib/push';

let postSpy: jest.SpiedFunction<typeof api.post>;

beforeEach(async () => {
  // Push is Android-only; Jest defaults to iOS.
  jest.replaceProperty(Platform, 'OS', 'android');
  await AsyncStorage.clear();
  postSpy = jest.spyOn(api, 'post').mockImplementation(async () => ({status: 'success'}) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('push registration', () => {
  it('registers the phone with its token and language', async () => {
    await registerPush('hi');
    expect(postSpy).toHaveBeenCalledWith(
      '/shared/devices',
      expect.objectContaining({token: 'fcm-token-for-tests-0000000000', lang: 'hi', platform: 'android'}),
    );
  });

  it('removes the phone on sign-out, only once', async () => {
    await registerPush('en');
    await Promise.all([unregisterPush(), unregisterPush()]);
    const removes = postSpy.mock.calls.filter(([url]) => url === '/shared/devices/remove');
    expect(removes.length).toBe(1);
  });

  it('the Settings switch turns pushes off and back on', async () => {
    await registerPush('en');
    await setPushEnabled(false, 'en');
    expect(await isPushEnabled()).toBe(false);
    postSpy.mockClear();
    await registerPush('en');
    expect(postSpy).not.toHaveBeenCalled();
    await setPushEnabled(true, 'en');
    expect(postSpy).toHaveBeenCalledWith('/shared/devices', expect.anything());
  });
});

describe('tapping a notification', () => {
  const tap = (screen?: string, id?: string) =>
    notificationTarget({_id: 'n1', type: 'x', params: {}, link: {screen, id}, readAt: null, createdAt: ''});

  it('opens the linked loan, lead or list', () => {
    expect(tap('Loan', 'L1')).toEqual(['Loan', {loanId: 'L1'}]);
    expect(tap('Lead', 'D1')).toEqual(['Lead', {id: 'D1'}]);
    expect(tap('Payments')).toEqual(['Payments', undefined]);
    expect(tap(undefined)).toBeNull();
  });
});
